
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Prompt, ToastMessage, Suggestion, CategoryRecord } from './types';
import { RAW_PROMPTS } from './data';
import { supabase } from './supabaseClient';

// --- Initial Default Categories (Fallback) ---
const DEFAULT_CATEGORIES: CategoryRecord[] = [
  { id: 'cat-jailbreaks', name: 'Latest Jailbreaks', icon: 'fas fa-skull-crossbones', color: '#ff6b6b' },
  { id: 'cat-leaks', name: 'Legendary Leaks', icon: 'fas fa-scroll', color: '#9c27b0' },
  { id: 'cat-grimoire', name: 'Grimoire', icon: 'fas fa-book', color: '#6a1b9a' },
  { id: 'cat-super', name: 'My Super Prompts', icon: 'fas fa-bolt', color: '#4caf50' },
  { id: 'cat-security', name: 'Prompt Security', icon: 'fas fa-shield-alt', color: '#2196f3' },
  { id: 'cat-ultra', name: 'Ultra Prompts', icon: 'fas fa-star', color: '#fbc02d' },
];

// --- Helper for default content ---
const getDefaultContent = (prompt: Partial<Prompt>) => {
  return `# ${prompt.name}\n\n[DECRYPTED_RECORD_ACTIVE]\n\nTYPE: ${prompt.tag}\nCATEGORY: ${prompt.category}\n\nINSTRUCTIONS:\n- Deploy ${prompt.name} sequence.\n- Target: High efficiency AI reasoning.\n- Constraints: Strictly maintain the identity of a ${prompt.tag?.toLowerCase()}.\n\n[PROMPT_BLOCK_START]\nSystem initialization... OK.\nAct as a specialized AI architect. Your task is to address the following query while adhering to the ${prompt.category} security protocols. Focus on high-fidelity output.\n[USER_QUERY_PLACEHOLDER]`;
};

// --- Helper for color parsing ---
const getTagStyles = (color?: string) => {
  if (color) {
    return {
      backgroundColor: `${color}26`, // 15% opacity
      color: color,
      border: `1px solid ${color}40`
    };
  }
  return {};
};

// --- Simple Markdown Renderer Component ---
const MarkdownContent: React.FC<{ content: string; accentColor: string }> = ({ content, accentColor }) => {
  const lines = content.split('\n');

  const renderLine = (line: string, index: number) => {
    if (line.startsWith('# ')) return <h1 key={index} style={{ color: accentColor, borderBottom: `3px solid ${accentColor}20`, paddingBottom: '15px', marginTop: '40px', marginBottom: '25px', fontSize: '2.5rem', fontWeight: 800 }}>{line.substring(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={index} style={{ color: accentColor, marginTop: '35px', marginBottom: '20px', fontSize: '1.8rem', fontWeight: 700 }}>{line.substring(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={index} style={{ color: accentColor, opacity: 0.9, marginTop: '25px', marginBottom: '15px', fontSize: '1.4rem' }}>{line.substring(4)}</h3>;
    if (line.trim() === '---') return <hr key={index} style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '40px 0' }} />;
    if (line.startsWith('> ')) {
      const isNote = line.toLowerCase().includes('note:') || line.toLowerCase().includes('!note');
      const isWarning = line.toLowerCase().includes('warning:') || line.toLowerCase().includes('!warning');
      const boxBg = isNote ? '#fdf2f8' : isWarning ? '#fffbeb' : '#f8fafc';
      const boxBorder = isNote ? '#db2777' : isWarning ? '#d97706' : accentColor;
      return (
        <div key={index} style={{ background: boxBg, borderLeft: `5px solid ${boxBorder}`, padding: '24px 30px', margin: '25px 0', borderRadius: '8px', fontSize: '1.05rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {processInlineStyles(line.substring(2), accentColor)}
        </div>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={index} style={{ display: 'flex', gap: '15px', paddingLeft: '20px', marginBottom: '12px', fontSize: '1.1rem' }}>
          <span style={{ color: accentColor, fontWeight: 900 }}>•</span>
          <span>{processInlineStyles(line.substring(2), accentColor)}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={index} style={{ height: '15px' }} />;
    return <p key={index} style={{ marginBottom: '18px', lineHeight: 1.8, color: '#1e293b', fontSize: '1.1rem' }}>{processInlineStyles(line, accentColor)}</p>;
  };

  const processInlineStyles = (text: string, accent: string) => {
    let parts: React.ReactNode[] = [text];
    parts = parts.flatMap(p => typeof p === 'string' ? p.split(/(\*\*.*?\*\*)/g).map(s => s.startsWith('**') ? <strong style={{ color: '#0f172a', fontWeight: 700 }}>{s.slice(2, -2)}</strong> : s) : p);
    parts = parts.flatMap(p => typeof p === 'string' ? p.split(/(<.*?>)/g).map(s => s.startsWith('<') ? <code style={{ background: `${accent}15`, color: accent, padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'monospace' }}>{s}</code> : s) : p);
    parts = parts.flatMap(p => typeof p === 'string' ? p.split(/(\[.*?\])/g).map(s => s.startsWith('[') ? <span style={{ fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>{s}</span> : s) : p);
    return parts;
  };

  return <div style={{ textAlign: 'left', maxWidth: '1100px', margin: '0 auto' }}>{lines.map((line, i) => renderLine(line, i))}</div>;
};

// --- Sub-Components ---

const LoadingScreen: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div id="loadingScreen" style={loadingScreenStyle}>
      <div className="loading-content" style={loadingContentStyle}>
        <div className="loading-spinner" style={spinnerStyle}></div>
        <h1 className="loading-title">Prompt Vault</h1>
        <p className="loading-subtitle">Initializing Secure Protocols…</p>
      </div>
    </div>
  );
};

const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);
  return <div id="toast" style={toastStyle}>{toast.message}</div>;
};

interface ModalProps {
  prompt: Prompt;
  onClose: () => void;
  onCopy: (text: string) => void;
  categoryColor: string;
}

const FullScreenPromptViewer: React.FC<ModalProps> = ({ prompt, onClose, onCopy, categoryColor }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const activeColor = prompt.color || categoryColor || '#ff8c00';

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 600));
        const baseContent = prompt.content || getDefaultContent(prompt);
        setContent(baseContent);
      } catch (err) {
        setContent('Error retrieving data from vault.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, [prompt]);

  return (
    <div style={fullScreenOverlayStyle}>
      <div style={{ ...viewerHeaderStyle, borderBottom: `4px solid ${activeColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onClose} style={viewerBackBtnStyle} title="Back to Archive">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>
              {prompt.isHidden && <i className="fas fa-eye-slash" style={{ marginRight: '10px', color: '#64748b', fontSize: '1.1rem' }}></i>}
              {prompt.name}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginTop: '2px' }}>
              <span style={{ color: activeColor }}>{prompt.category}</span> • SECURE RECORD
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => onCopy(content)} style={{ ...viewerCopyBtnStyle, background: activeColor }}>
            <i className="fas fa-copy"></i> Copy Content
          </button>
        </div>
      </div>
      <div style={viewerBodyLayoutStyle}>
        <div style={viewerMainContentStyle}>
          {loading ? (
            <div style={viewerLoadingIndicatorStyle}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: activeColor }}></i>
              <p style={{ marginTop: '15px', fontWeight: 600 }}>Decrypting Secure Record...</p>
            </div>
          ) : (
            <div style={contentWrapperStyle}>
              <MarkdownContent content={content} accentColor={activeColor} />
              <div style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                <i className="fas fa-shield-halved" style={{ marginRight: '8px', color: activeColor }}></i>
                This record is protected by Vault Protocol 7. Unauthorized duplication is logged.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PromptFormModalProps {
  prompt?: Prompt | Suggestion;
  categories: CategoryRecord[];
  title?: string;
  onSave: (prompt: Partial<Prompt>) => void;
  onClose: () => void;
  submitLabel?: string;
}

const PromptFormModal: React.FC<PromptFormModalProps> = ({ prompt, categories, title, onSave, onClose, submitLabel }) => {
  const [formData, setFormData] = useState<Partial<Prompt>>(() => {
    if (prompt) {
      return {
        ...prompt,
        content: prompt.content || getDefaultContent(prompt),
        isHidden: !!prompt.isHidden
      };
    }
    return {
      name: '',
      description: '',
      category: categories[0]?.name || 'Latest Jailbreaks',
      tag: 'Jailbreak',
      content: '',
      color: '',
      isHidden: false
    };
  });

  const presetColors = ['#ff6b6b', '#9c27b0', '#6a1b9a', '#4caf50', '#2196f3', '#fbc02d', '#ff8c00'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as any;
    const { name, value, type, checked } = target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const activeCategory = categories.find(c => c.name === formData.category);
  const activeColor = formData.color || activeCategory?.color || '#ff8c00';

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalContentStyle, maxWidth: '900px', flexDirection: 'row' }}>
        <div style={{ flex: 1, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={modalHeaderStyle}>
            <h3 style={modalTitleStyle}>
              <i className={`fas ${prompt ? 'fa-edit' : 'fa-plus-circle'}`} style={{ marginRight: '8px', color: activeColor }}></i>
              {title || (prompt ? 'Edit Record' : 'Add New Record')}
            </h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '24px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={formLabelStyle}>Record Name</label>
                <input name="name" value={formData.name} onChange={handleChange} style={formInputStyle} required placeholder="e.g. Master Leak v1.0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={formLabelStyle}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} style={formInputStyle}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={formLabelStyle}>Short Description</label>
              <input name="description" value={formData.description} onChange={handleChange} style={formInputStyle} placeholder="Implementation summary..." />
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={formLabelStyle}>UI Tag Label</label>
                <input name="tag" value={formData.tag} onChange={handleChange} style={formInputStyle} placeholder="Jailbreak, Utility, etc." />
              </div>
              <div style={{ flex: 1 }}>
                <label style={formLabelStyle}>Tag Colour Overide (Optional)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {presetColors.map(c => (
                    <div
                      key={c}
                      onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                      style={{ width: '20px', height: '20px', borderRadius: '4px', background: c, cursor: 'pointer', border: formData.color === c ? '2px solid #000' : '2px solid transparent' }}
                    />
                  ))}
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, color: '' }))} style={{ fontSize: '0.6rem', padding: '2px 4px', cursor: 'pointer' }}>Auto</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
              <input type="checkbox" id="isHidden" name="isHidden" checked={formData.isHidden} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="isHidden" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', cursor: 'pointer' }}>
                <i className="fas fa-eye-slash" style={{ marginRight: '6px' }}></i> Hidden Record (Strict Private Access)
              </label>
            </div>
            <div>
              <label style={formLabelStyle}>Prompt Instructions</label>
              <textarea name="content" value={formData.content} onChange={handleChange} style={{ ...formInputStyle, height: '140px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} placeholder="Full system instruction set..." />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button type="submit" style={{ flex: 2, background: activeColor, color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                {submitLabel || (prompt ? 'Update Record' : 'Save Record')}
              </button>
              <button type="button" onClick={onClose} style={{ flex: 1, background: '#eee', color: '#666', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
        <div style={{ width: '320px', background: '#f8fafc', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={tagLabelStyle}>Live Preview</p>
          <div className="script-card" style={{ borderLeft: `4px solid ${activeColor}`, margin: 0, opacity: 1, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
            <div className="script-title">
              <i className="fas fa-file-alt" style={{ color: activeColor }}></i>
              {formData.isHidden && <i className="fas fa-eye-slash" style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '4px' }}></i>}
              {formData.name || 'Untitled Prompt'}
            </div>
            <p className="script-desc" style={{ color: activeColor, minHeight: '3em' }}>
              {formData.description || 'Description will appear here…'}
            </p>
            <div className="script-meta">
              <span className="tag" style={getTagStyles(activeColor)}>{formData.tag || 'Tag'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CategoryManagerModalProps {
  categories: CategoryRecord[];
  onSave: (cat: CategoryRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ categories, onSave, onDelete, onClose }) => {
  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null);
  const [newCat, setNewCat] = useState<Partial<CategoryRecord>>({ name: '', icon: 'fas fa-tag', color: '#ff8c00' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCat) {
      onSave(editingCat);
      setEditingCat(null);
    } else if (newCat.name) {
      onSave({ ...newCat, id: `cat-${Date.now()}` } as CategoryRecord);
      setNewCat({ name: '', icon: 'fas fa-tag', color: '#ff8c00' });
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalContentStyle, maxWidth: '600px' }}>
        <div style={modalHeaderStyle}>
          <h3 style={modalTitleStyle}><i className="fas fa-folder-open"></i> Manage Categories</h3>
          <button onClick={onClose} style={modalCloseBtnStyle}><i className="fas fa-times"></i></button>
        </div>
        <div style={{ padding: '24px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={formLabelStyle}>{editingCat ? 'Edit Category' : 'New Category Name'}</label>
              <input
                value={editingCat ? editingCat.name : newCat.name}
                onChange={(e) => editingCat ? setEditingCat({ ...editingCat, name: e.target.value }) : setNewCat({ ...newCat, name: e.target.value })}
                style={formInputStyle} placeholder="Category name..." required
              />
            </div>
            <div style={{ width: '80px' }}>
              <label style={formLabelStyle}>Icon</label>
              <input
                value={editingCat ? editingCat.icon : newCat.icon}
                onChange={(e) => editingCat ? setEditingCat({ ...editingCat, icon: e.target.value }) : setNewCat({ ...newCat, icon: e.target.value })}
                style={formInputStyle} placeholder="fas fa-tag" required
              />
            </div>
            <div style={{ width: '60px' }}>
              <label style={formLabelStyle}>Color</label>
              <input
                type="color"
                value={editingCat ? editingCat.color : newCat.color}
                onChange={(e) => editingCat ? setEditingCat({ ...editingCat, color: e.target.value }) : setNewCat({ ...newCat, color: e.target.value })}
                style={{ ...formInputStyle, height: '40px', padding: '2px' }}
              />
            </div>
            <button type="submit" style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>
              {editingCat ? 'Save' : 'Add'}
            </button>
            {editingCat && <button type="button" onClick={() => setEditingCat(null)} style={{ background: '#ccc', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>}
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', border: '1px solid #f1f5f9', borderRadius: '12px', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cat.color, display: 'grid', placeItems: 'center', color: '#fff' }}>
                    <i className={cat.icon}></i>
                  </div>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{cat.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditingCat(cat)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }} title="Edit"><i className="fas fa-edit"></i></button>
                  <button onClick={() => onDelete(cat.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }} title="Delete"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SuggestionsReviewModalProps {
  suggestions: Suggestion[];
  onApprove: (suggestion: Suggestion) => void;
  onRevise: (suggestion: Suggestion) => void;
  onReject: (id: string) => void;
  onClose: () => void;
  categoryColor: (name: string) => string;
}

const SuggestionsReviewModal: React.FC<SuggestionsReviewModalProps> = ({ suggestions, onApprove, onRevise, onReject, onClose, categoryColor }) => {
  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalContentStyle, maxWidth: '800px' }}>
        <div style={modalHeaderStyle}>
          <h3 style={modalTitleStyle}><i className="fas fa-tasks"></i> Pending Suggestions Review</h3>
          <button onClick={onClose} style={modalCloseBtnStyle}><i className="fas fa-times"></i></button>
        </div>
        <div style={{ padding: '24px', background: '#fff', overflowY: 'auto', maxHeight: '70vh' }}>
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '3rem', marginBottom: '15px', display: 'block' }}></i>
              No pending suggestions to review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {suggestions.map(s => (
                <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{s.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 8px' }}>{s.description}</p>
                    <span className="tag" style={{ ...getTagStyles(categoryColor(s.category as string)), fontSize: '0.7rem' }}>{s.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => onApprove(s)} title="Approve as-is" style={{ background: '#10b981', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-check"></i></button>
                    <button onClick={() => onRevise(s)} title="Revise and Approve" style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-edit"></i></button>
                    <button onClick={() => onReject(s.id)} title="Reject" style={{ background: '#ef4444', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LoginModalProps {
  onLogin: (password: string) => boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(password)) onClose(); else { setError(true); setPassword(''); }
  };
  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
        <div style={modalHeaderStyle}>
          <h3 style={modalTitleStyle}><i className="fas fa-user-shield"></i> Vault Authentication</h3>
          <button onClick={onClose} style={modalCloseBtnStyle}><i className="fas fa-times"></i></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px', background: 'var(--bg-primary)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Access Passphrase</label>
            <input type="password" autoFocus value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }} placeholder="Enter admin password..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: error ? '2px solid #ef4444' : '1px solid var(--border)', outline: 'none', background: '#f8fafc', fontSize: '1rem' }} />
            {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>Invalid Passphrase. Access denied.</p>}
          </div>
          <button type="submit" style={{ width: '100%', background: 'var(--bg-accent)', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Authenticate & Unlock</button>
        </form>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('prompt_vault_admin') === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [titleClickCount, setTitleClickCount] = useState(0);

  // Initialize with local data to prevent empty screen on first visit
  const [categories, setCategories] = useState<CategoryRecord[]>(DEFAULT_CATEGORIES);
  const [prompts, setPrompts] = useState<Prompt[]>(RAW_PROMPTS);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fetchAllData = async () => {
    try {
      const [catsRes, promptsRes, suggestionsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('prompts').select('*'),
        supabase.from('suggestions').select('*').eq('status', 'pending')
      ]);

      // Only update state if we actually got data back from the cloud
      if (catsRes.data && catsRes.data.length > 0) {
        setCategories(catsRes.data);
      } else {
        console.warn("Categories table empty or missing, using local seed.");
      }

      if (promptsRes.data && promptsRes.data.length > 0) {
        setPrompts(promptsRes.data);
      } else {
        console.warn("Prompts table empty or missing, using local seed.");
      }

      if (suggestionsRes.data) {
        setSuggestions(suggestionsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      addToast("Cloud connectivity error - Using local archive", "info");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); addToast("📋 Copied to clipboard", 'success'); };

  const handleLogin = (password: string) => {
    if (password === 'dqadm') {
      setIsAdmin(true);
      localStorage.setItem('prompt_vault_admin', 'true');
      addToast("🔓 Authorization Successful", 'success');
      return true;
    }
    return false;
  };

  const handleLogout = () => { setIsAdmin(false); localStorage.removeItem('prompt_vault_admin'); addToast("🔒 Vault Session Terminated", 'info'); };

  const handleSavePrompt = async (promptData: Partial<Prompt>) => {
    const dataToSave = editingPrompt
      ? { ...editingPrompt, ...promptData }
      : { ...promptData, id: `custom-${Date.now()}`, path: `custom/${Date.now()}.md` };

    const { error } = await supabase.from('prompts').upsert(dataToSave);

    if (error) {
      addToast("Cloud save failed - Local only update", "error");
    }

    if (editingPrompt) {
      setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? dataToSave as Prompt : p));
      addToast("✅ Record updated", 'success');
      setEditingPrompt(null);
    } else {
      setPrompts(prev => [dataToSave as Prompt, ...prev]);
      addToast("✅ Record saved", 'success');
      setIsAddingPrompt(false);
    }
  };

  const handleSaveCategory = async (cat: CategoryRecord) => {
    const { error } = await supabase.from('categories').upsert(cat);

    if (error) {
      addToast("Cloud save failed", "error");
    }

    setCategories(prev => {
      const exists = prev.find(c => c.id === cat.id);
      if (exists) {
        if (exists.name !== cat.name) {
          setPrompts(pPrev => pPrev.map(p => p.category === exists.name ? { ...p, category: cat.name } : p));
        }
        return prev.map(c => c.id === cat.id ? cat : c);
      }
      return [...prev, cat];
    });
    addToast(`📁 Category "${cat.name}" saved`, 'success');
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    if (window.confirm(`Are you sure? All prompts in "${cat.name}" will move to Uncategorized.`)) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) { addToast("Cloud delete failed", "error"); }

      setCategories(prev => prev.filter(c => c.id !== id));
      setPrompts(prev => prev.map(p => p.category === cat.name ? { ...p, category: 'Uncategorized' } : p));
      addToast(`🗑️ Category "${cat.name}" removed`, 'info');
    }
  };

  const handleSaveRevisedSuggestion = async (promptData: Partial<Prompt>) => {
    if (!editingSuggestion) return;

    const newPrompt = {
      ...promptData,
      id: `revised-${Date.now()}`,
      path: `revised/${Date.now()}.md`,
      isHidden: false
    };

    const { error: pErr } = await supabase.from('prompts').insert(newPrompt);
    const { error: sErr } = await supabase.from('suggestions').delete().eq('id', editingSuggestion.id);

    setPrompts(prev => [newPrompt as Prompt, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== editingSuggestion.id));
    setEditingSuggestion(null);
    addToast("✅ Suggestion approved with revisions", 'success');
  };

  const handleSuggestPrompt = async (suggestionData: Partial<Prompt>) => {
    // Sanitize data to match schema (remove isHidden, path, etc. if not in suggestions table)
    const { name, description, category, content, tag, color } = suggestionData;

    const newSug = {
      id: `suggestion-${Date.now()}`,
      name: name || 'Untitled',
      description: description || '',
      category: category || 'Uncategorized',
      content: content || '',
      tag: tag || 'Suggestion',
      color: color || '',
      status: 'pending',
      suggestedAt: Date.now()
    };

    const { error } = await supabase.from('suggestions').insert(newSug);

    if (error) {
      console.error("Suggestion insert error:", error);
      addToast("Cloud submission failed", "error");
    } else {
      setSuggestions(prev => [newSug as Suggestion, ...prev]);
      addToast("🚀 Suggestion sent for verification", 'success');
      setIsSuggesting(false);
    }
  };

  const handleApproveSuggestion = async (suggestion: Suggestion) => {
    const newPrompt = {
      ...suggestion,
      id: `approved-${Date.now()}`,
      path: `approved/${Date.now()}.md`,
      isHidden: false
    };

    const { status, suggestedAt, ...promptOnly } = newPrompt;

    const { error: pErr } = await supabase.from('prompts').insert(promptOnly);
    const { error: sErr } = await supabase.from('suggestions').delete().eq('id', suggestion.id);

    setPrompts(prev => [promptOnly as Prompt, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    addToast("✅ Suggestion merged into vault", 'success');
  };

  const handleRejectSuggestion = async (id: string) => {
    await supabase.from('suggestions').delete().eq('id', id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
    addToast("🗑️ Suggestion dismissed", 'info');
  };

  const handleDeletePrompt = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Purge this record from the archive permanently?")) {
      await supabase.from('prompts').delete().eq('id', id);
      setPrompts(prev => prev.filter(p => p.id !== id));
      addToast("🗑️ Record purged", 'info');
    }
  };

  const togglePromptVisibility = async (id: string) => {
    if (!isAdmin) return;
    const target = prompts.find(p => p.id === id);
    if (!target) return;

    await supabase.from('prompts').update({ isHidden: !target.isHidden }).eq('id', id);
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, isHidden: !p.isHidden } : p));
    addToast("👁️ Visibility toggled", 'info');
  };

  const handleSyncToCloud = async () => {
    if (!isAdmin || !window.confirm("IMPORTANT: This will push all local records to the cloud. Existing cloud records with same IDs will be updated.")) return;
    setIsLoading(true);
    try {
      const { error: cErr } = await supabase.from('categories').upsert(DEFAULT_CATEGORIES);
      const { error: pErr } = await supabase.from('prompts').upsert(RAW_PROMPTS);

      if (cErr || pErr) throw new Error("Sync failed");

      addToast("Cloud synchronization successful", "success");
      fetchAllData();
    } catch (e) {
      addToast("Sync encountered errors - check schema configuration", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      categories,
      prompts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-vault-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Data exported successfully", "success");
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.categories || !json.prompts) throw new Error("Invalid backup format");

        setIsLoading(true);

        // Upsert categories
        const { error: cErr } = await supabase.from('categories').upsert(json.categories);
        if (cErr) console.warn("Category import issue:", cErr);

        // Upsert prompts
        const { error: pErr } = await supabase.from('prompts').upsert(json.prompts);
        if (pErr) console.warn("Prompt import issue:", pErr);

        // Refresh data
        await fetchAllData();
        addToast("Vault restored from backup", "success");
      } catch (err) {
        console.error("Import error:", err);
        addToast("Failed to import data: Invalid file", "error");
      } finally {
        setIsLoading(false);
        // Reset input
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const getCategoryColor = (name: string) => categories.find(c => c.name === name)?.color || '#ff8c00';

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      if (p.isHidden && !isAdmin) return false;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      return matchesCategory && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    });
  }, [selectedCategory, searchQuery, prompts, isAdmin]);

  const menuCategories = useMemo(() => [{ id: 'all', name: 'All', icon: 'fas fa-layer-group', color: '#ff8c00' }, ...categories], [categories]);

  return (
    <>
      <style>{`
        .main { flex: 1; padding: 2rem; position: relative; }
        header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; }
        .header-content { flex: 1; }
        h1 { font-size: 2.2rem; font-weight: 700; margin-bottom: .5rem; background: linear-gradient(90deg, var(--bg-accent), #79c0ff); -webkit-background-clip: text; background-clip: text; color: transparent; cursor: pointer; user-select: none; }
        .subtitle { font-size: 1rem; color: #b8b8b8; max-width: 800px; }
        .admin-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .admin-btn { background: #f8fafc; border: 1px solid var(--border); color: #64748b; padding: 8px 16px; borderRadius: 10px; fontSize: 0.85rem; fontWeight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .admin-btn:hover { background: #f1f5f9; color: #1e293b; border-color: #94a3b8; }
        .admin-btn.logged-in { background: #fff7ed; border-color: var(--bg-accent); color: var(--bg-accent); }
        .admin-btn.add-btn { background: var(--bg-accent); color: #000; border-color: var(--bg-accent-dark); }
        .admin-btn.suggest-btn { background: #fdf2f8; color: #db2777; border-color: #fce7f3; }
        .admin-btn.review-btn { background: #f0fdf4; color: #166534; border-color: #dcfce7; position: relative; }
        .admin-btn.cat-btn { background: #eef2ff; color: #4338ca; border-color: #e0e7ff; }
        .admin-btn.sync-btn { background: #f8fafc; color: #64748b; border: 1px dashed var(--border); }
        .admin-btn.review-btn .badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 0.6rem; min-width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; border: 2px solid #fff; }
        .vault-access-btn { background: #222; color: #fff; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: transform 0.2s; }
        .search-box { margin: 1.5rem 0; position: relative; }
        .search-box input { width: 100%; padding: .8rem 1rem; padding-left: 2.5rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 1rem; outline: none; }
        .search-box i { position: absolute; left: .8rem; top: 50%; transform: translateY(-50%); color: #888; }
        .script-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; opacity: 0; animation: fadeIn .5s forwards; }
        .script-card { background: var(--card-bg); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); transition: all .3s ease; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .script-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-hover); }
        .script-title { font-size: 1.2rem; font-weight: 600; margin-bottom: .5rem; display: flex; align-items: center; gap: .5rem; color: var(--text-secondary); }
        .script-desc { font-size: .95rem; line-height: 1.5; margin-bottom: 1rem; color: var(--text-secondary); flex: 1; }
        .tag { padding: .25rem .75rem; border-radius: 20px; font-size: .75rem; font-weight: 500; }
        .script-actions { display: flex; gap: .75rem; opacity: 0; transition: opacity .3s; margin-top: auto; }
        .script-card:hover .script-actions { opacity: 1; }
        .btn { display: inline-flex; align-items: center; gap: .5rem; padding: .5rem 1rem; border-radius: 6px; font-size: .875rem; font-weight: 500; border: none; cursor: pointer; }
        .fab { position: fixed; bottom: 30px; right: 30px; width: 56px; height: 56px; border-radius: 50%; background: var(--bg-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 6px 16px rgba(0,0,0,.2); cursor: pointer; z-index: 1000; border: none; }
        .category-menu { position: fixed; bottom: 90px; right: 30px; background: var(--bg-secondary); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.2); padding: 12px 0; min-width: 200px; max-height: 400px; overflow-y: auto; z-index: 999; opacity: 0; visibility: hidden; transform: translateY(20px); transition: all 0.3s; border: 1px solid var(--border); }
        .category-menu.active { opacity: 1; visibility: visible; transform: translateY(0); }
        .category-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; color: var(--text-primary); font-size: 0.95rem; border-radius: 8px; transition: background 0.2s; white-space: nowrap; }
        .category-item:hover { background: rgba(0,0,0,0.05); }
        .category-item.active { font-weight: 700; background: rgba(0,0,0,0.03); }

        /* Vault Button Design */
        .btn-vault {
            background: linear-gradient(145deg, #1e293b, #0f172a);
            color: #e2e8f0;
            border: 1px solid #334155;
            padding: 10px 20px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            letter-spacing: 0.5px;
        }
        
        .btn-vault::before {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: 0.5s;
        }
        
        .btn-vault:hover::before {
            left: 100%;
        }

        .btn-vault:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
            border-color: #60a5fa;
            color: #fff;
            text-shadow: 0 0 8px rgba(255,255,255,0.5);
        }

        .btn-vault i {
            color: var(--bg-accent);
            transition: transform 0.3s ease;
        }
        
        .btn-vault:hover i {
            transform: scale(1.1) rotate(5deg);
            filter: drop-shadow(0 0 5px var(--bg-accent));
        }
      `}</style>

      <LoadingScreen active={isLoading} />

      <main className="main">
        <header>
          <div className="header-content">
            <h1 onClick={() => setTitleClickCount(p => p + 1)} title="Vault Administration">
              <i className="fas fa-file-alt"></i> Prompt Vault
            </h1>
            <p className="subtitle">High-fidelity AI orchestration ecosystem • Synchronized Secure Cloud.</p>
          </div>
          <div className="admin-controls">
            <a href="https://github.com/xcode96" target="_blank" rel="noreferrer" className="btn-vault" style={{ textDecoration: 'none', padding: '10px 14px', background: '#000', borderColor: '#333' }} title="GitHub Repository">
              <i className="fab fa-github" style={{ fontSize: '1.2rem', color: '#fff' }}></i>
            </a>
            <button className="btn-vault" onClick={() => setIsSuggesting(true)}>
              <i className="fas fa-lightbulb"></i> Suggest Prompt
            </button>
            {isAdmin ? (
              <>
                <button className="btn-vault" onClick={() => setIsManagingCategories(true)}>
                  <i className="fas fa-folder-tree"></i> Categories
                </button>
                <button className="btn-vault" onClick={() => { fetchAllData(); setIsReviewing(true); }}>
                  <i className="fas fa-tasks"></i> Review
                  {suggestions.length > 0 && <span className="badge" style={{ background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '5px' }}> {suggestions.length}</span>}
                </button>
                <button className="btn-vault" onClick={() => { setEditingPrompt(null); setIsAddingPrompt(true); }}>
                  <i className="fas fa-plus"></i> New Record
                </button>
                <button className="btn-vault" onClick={handleSyncToCloud} title="Push Seed Data to Cloud">
                  <i className="fas fa-cloud-upload-alt"></i> Initialize Cloud
                </button>
                <button className="btn-vault" onClick={handleExportData} title="Backup Vault">
                  <i className="fas fa-file-export"></i> Export
                </button>
                <button className="btn-vault" onClick={() => document.getElementById('import-input')?.click()} title="Restore Vault">
                  <i className="fas fa-file-import"></i> Import
                </button>
                <input id="import-input" type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportData} />
                <button className="btn-vault" onClick={handleLogout}>
                  <i className="fas fa-lock-open"></i> Terminate
                </button>
              </>
            ) : (
              <button className="btn-vault" onClick={() => setIsLoginModalOpen(true)}>
                <i className="fas fa-user-shield"></i> Vault Access
              </button>
            )}
          </div>
        </header>

        <div className="search-box">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search our secure repository…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="script-grid">
          {filteredPrompts.length > 0 ? filteredPrompts.map(p => {
            const activeColor = p.color || getCategoryColor(p.category);
            const tagStyles = getTagStyles(activeColor);
            return (
              <div key={p.id} className={`script-card ${p.isHidden ? 'is-hidden' : ''}`} style={{ borderLeft: `4px solid ${activeColor}`, opacity: p.isHidden ? 0.7 : 1, backgroundColor: 'white' }}>
                <div className="script-title">
                  <i className="fas fa-file-alt" style={{ color: activeColor }}></i>
                  {p.isHidden && <i className="fas fa-eye-slash" title="Hidden Record" style={{ fontSize: '0.8rem', color: '#64748b' }}></i>}
                  {p.name}
                </div>
                <p className="script-desc" style={{ color: activeColor, opacity: 0.9 }}>{p.description}</p>
                <div className="script-meta">
                  <span className="tag" style={tagStyles}>{p.tag}</span>
                  {p.isHidden && <span className="tag" style={{ background: '#64748b', color: '#fff' }}>Hidden</span>}
                </div>
                <div className="script-actions">
                  <button className="btn" style={{ background: activeColor, color: '#fff' }} onClick={() => handleCopy(p.name)}><i className="fas fa-copy"></i> Copy Name</button>
                  <button className="btn" style={{ background: '#444', color: '#fff' }} onClick={() => setSelectedPrompt(p)}><i className="fas fa-eye"></i> View</button>
                  {isAdmin && (
                    <>
                      <button className="btn" style={{ background: '#64748b', color: '#fff' }} onClick={() => togglePromptVisibility(p.id)}><i className={`fas ${p.isHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i></button>
                      <button className="btn" style={{ background: '#3b82f6', color: '#fff' }} onClick={() => setEditingPrompt(p)}><i className="fas fa-edit"></i></button>
                      <button className="btn" style={{ background: '#ef4444', color: '#fff' }} onClick={() => handleDeletePrompt(p.id)}><i className="fas fa-trash"></i></button>
                    </>
                  )}
                </div>
              </div>
            );
          }) : <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#888' }}>🔍 No records found. Try clearing filters or initializing the cloud repository.</div>}
        </div>
      </main>

      <button className="fab" onClick={() => setIsMenuOpen(!isMenuOpen)}><i className={isMenuOpen ? "fas fa-times" : "fas fa-folder"}></i></button>
      <div className={`category-menu ${isMenuOpen ? 'active' : ''}`}>
        {menuCategories.map(cat => (
          <div key={cat.id} className={`category-item ${selectedCategory === cat.name ? 'active' : ''}`} onClick={() => { setSelectedCategory(cat.name); setIsMenuOpen(false); }}>
            <i className={cat.icon} style={{ color: cat.color }}></i> {cat.name}
          </div>
        ))}
      </div>

      {selectedPrompt && <FullScreenPromptViewer prompt={selectedPrompt} categoryColor={getCategoryColor(selectedPrompt.category)} onClose={() => setSelectedPrompt(null)} onCopy={handleCopy} />}
      {(isAddingPrompt || editingPrompt) && <PromptFormModal prompt={editingPrompt || undefined} categories={categories} onSave={handleSavePrompt} onClose={() => { setIsAddingPrompt(false); setEditingPrompt(null); }} />}
      {editingSuggestion && <PromptFormModal prompt={editingSuggestion} categories={categories} title="Revise Suggestion" submitLabel="Approve with Revisions" onSave={handleSaveRevisedSuggestion} onClose={() => setEditingSuggestion(null)} />}
      {isSuggesting && <PromptFormModal title="Suggest a New Prompt" categories={categories} submitLabel="Submit Suggestion" onSave={handleSuggestPrompt} onClose={() => setIsSuggesting(false)} />}
      {isReviewing && <SuggestionsReviewModal suggestions={suggestions} categoryColor={getCategoryColor} onApprove={handleApproveSuggestion} onRevise={(s) => { setIsReviewing(false); setEditingSuggestion(s); }} onReject={handleRejectSuggestion} onClose={() => setIsReviewing(false)} />}
      {isManagingCategories && <CategoryManagerModal categories={categories} onSave={handleSaveCategory} onDelete={handleDeleteCategory} onClose={() => setIsManagingCategories(false)} />}
      {isLoginModalOpen && <LoginModal onLogin={handleLogin} onClose={() => setIsLoginModalOpen(false)} />}

      <div>{toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} />)}</div>
    </>
  );
};

export default App;

const loadingScreenStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#fdfdfd', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999, transition: 'opacity .6s' };
const loadingContentStyle: React.CSSProperties = { textAlign: 'center', animation: 'fadeInUp .8s' };
const spinnerStyle: React.CSSProperties = { width: '50px', height: '50px', border: '4px solid rgba(0,0,0,.1)', borderTop: '4px solid #ff8c00', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' };
const toastStyle: React.CSSProperties = { position: 'fixed', bottom: '30px', right: '30px', background: '#ff8c00', color: '#000', padding: '12px 24px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,.3)', zIndex: 10000, animation: 'slideIn 0.3s forwards' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContentStyle: React.CSSProperties = { background: '#fff', borderRadius: '12px', width: '95%', maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.6)' };
const modalHeaderStyle: React.CSSProperties = { padding: '16px 20px', background: '#fff', borderBottom: '1px solid #d8e3f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const modalTitleStyle: React.CSSProperties = { color: '#222', margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center' };
const modalCloseBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer', padding: '5px' };
const formLabelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' };
const formInputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d8e3f0', outline: 'none', background: '#f8fafc', fontSize: '0.9rem' };
const tagLabelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 800, color: '#aaa', textTransform: 'uppercase', marginBottom: '8px' };

// --- Viewer Styles ---
const fullScreenOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#ffffff', zIndex: 2000, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const viewerHeaderStyle: React.CSSProperties = { padding: '1.5rem 2rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 };
const viewerBackBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s' };
const viewerCopyBtnStyle: React.CSSProperties = { padding: '12px 24px', borderRadius: '12px', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const viewerBodyLayoutStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', background: '#fcfcfc', padding: '40px 20px' };
const viewerMainContentStyle: React.CSSProperties = { maxWidth: '900px', margin: '0 auto', background: '#fff', padding: '60px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', minHeight: '100%' };
const viewerLoadingIndicatorStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' };
const contentWrapperStyle: React.CSSProperties = { animation: 'fadeIn 0.5s ease-out' };
