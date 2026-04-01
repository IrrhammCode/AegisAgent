import React, { useState, useRef, useCallback } from 'react';
import { AVAILABLE_TARGETS } from '../hooks/useAegisAgent';
import {
  Rocket, Shield, UploadCloud, File, X, Plus, Lock
} from 'lucide-react';

interface MissionControlProps {
  operatorAddress: string;
  onDeploy: (targets: string[]) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const MissionControl: React.FC<MissionControlProps> = ({ operatorAddress, onDeploy }) => {
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTargetDeploy = (id: string) => {
    const target = AVAILABLE_TARGETS.find(t => t.id === id);
    if (target?.isComingSoon) return;
    onDeploy([id]);
  };

  const shortAddr = operatorAddress
    ? `${operatorAddress.slice(0, 6)}...${operatorAddress.slice(-4)}`
    : '0x...';

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    fileArray.forEach(f => formData.append('files', f));

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(prev => [
          ...prev,
          ...data.files.map((f: any) => ({ name: f.name, size: f.size }))
        ]);
        
        // Auto-deploy on successful upload for frictionless UX
        setTimeout(() => onDeploy(['local']), 800);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [onDeploy]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mission-control animate-fade-in">
      <div className="grid-bg" />

      {/* Header */}
      <div className="mc-header">
        <div className="mc-header-left">
          <div className="mc-icon-wrap">
            <Shield size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="mc-title">Mission Control</h1>
            <p className="mc-subtitle">Configure scan targets and deploy your agent</p>
          </div>
        </div>
        <div className="mc-operator-badge">
          <span className="mc-operator-label">OPERATOR</span>
          <span className="mc-operator-addr">{shortAddr}</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mc-layout">

        {/* Left: Scan Targets */}
        <div className="mc-column">
          <div className="mc-col-header">
            <h2>Scan Targets</h2>
            <p>Select a data source to begin immediate scan</p>
          </div>
          <div className="mc-targets-grid">
            {AVAILABLE_TARGETS.map(target => {
              const IconComp = target.icon as any;
              const isComingSoon = target.isComingSoon;

              return (
                <div
                  key={target.id}
                  className={`mc-target-card ${isComingSoon ? 'mc-target-disabled' : 'hover-glow'}`}
                  onClick={() => handleTargetDeploy(target.id)}
                  style={{ cursor: isComingSoon ? 'not-allowed' : 'pointer' }}
                >
                  {!isComingSoon && <div className="mc-target-check"><Rocket size={16} /></div>}
                  {isComingSoon && <span className="coming-soon-badge">SOON</span>}
                  <div className="mc-target-icon mc-target-icon-active">
                    <IconComp size={20} strokeWidth={1.5} />
                  </div>
                  <h3>{target.label}</h3>
                  <p>{target.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Manual Upload */}
        <div className="mc-column">
          <div className="mc-col-header">
            <h2>Manual Upload</h2>
            <p>Drop files here for instant zero-knowledge encryption</p>
          </div>

          {/* Drop Zone */}
          <div
            className={`mc-dropzone ${isDragOver ? 'mc-dropzone-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
            <div className="mc-dropzone-inner">
              <div className="mc-dropzone-icon">
                {isUploading ? (
                  <div className="mc-spinner" />
                ) : (
                  <UploadCloud size={28} strokeWidth={1.5} />
                )}
              </div>
              <div className="mc-dropzone-text">
                <span className="mc-dropzone-title">
                  {isUploading ? 'Encrypting & uploading...' : 'Drop files here or click to browse'}
                </span>
                <span className="mc-dropzone-hint">
                  Documents, source code, images — up to 50 MB each
                </span>
              </div>
              <button className="btn btn-ghost mc-browse-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Plus size={14} /> Browse
              </button>
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mc-file-list">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="mc-file-item">
                  <div className="mc-file-icon"><File size={14} /></div>
                  <div className="mc-file-info">
                    <span className="mc-file-name">{f.name}</span>
                    <span className="mc-file-size">{formatSize(f.size)}</span>
                  </div>
                  <div className="mc-file-status">
                    <Lock size={12} />
                    <span>Queued</span>
                  </div>
                  <button className="mc-file-remove" onClick={() => removeFile(f.name)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionControl;
