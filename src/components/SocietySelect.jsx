import { useState, useEffect, useRef } from 'react';
import { getSocieties, createSociety } from '../api/admin';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useDebounce } from '../hooks/useDebounce';

const SocietySelect = ({
  value,
  onChange,
  required = false,
  id = 'societySelect',
  allowInlineCreate = false,
  label = 'Select Society',
  isMulti = false,
}) => {
  const [societies, setSocieties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [showNewSocietyForm, setShowNewSocietyForm] = useState(false);
  const [newSocName, setNewSocName] = useState('');
  const [newSocAddress, setNewSocAddress] = useState('');
  const [isCreatingSoc, setIsCreatingSoc] = useState(false);
  const [socError, setSocError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchSocieties = async (searchTerm, pageNum = 1, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSocieties({ search: searchTerm, page: pageNum, limit: 20 });
      const items = Array.isArray(data?.societies) ? data.societies : (Array.isArray(data) ? data : []);
      if (append) {
        setSocieties((prev) => {
          const newItems = items.filter(it => !prev.some(p => p.id === it.id || p._id === (it._id || it.id)));
          return [...prev, ...newItems];
        });
      } else {
        setSocieties(items);
      }
      setHasMore(data?.pagination?.page < data?.pagination?.pages);
    } catch (err) {
      console.error('Failed to fetch societies:', err);
      setError(getErrorMessage(err, 'Failed to load societies.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchSocieties(debouncedSearch, 1, false);
    }
  }, [debouncedSearch, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSocieties(debouncedSearch, nextPage, true);
    }
  };

  const handleInlineCreateSociety = async (e) => {
    e.preventDefault();
    if (!newSocName.trim()) {
      setSocError('Please enter society name.');
      return;
    }

    setSocError(null);
    setIsCreatingSoc(true);

    try {
      const newSoc = await createSociety({
        name: newSocName.trim(),
        address: newSocAddress.trim() || undefined,
      });

      const createdId = newSoc?._id || newSoc?.id;
      
      // Update selected
      if (createdId && onChange) {
        if (isMulti) {
          const currentArr = Array.isArray(value) ? value : [];
          onChange([...currentArr, createdId]);
        } else {
          onChange(createdId);
        }
      }

      setNewSocName('');
      setNewSocAddress('');
      setShowNewSocietyForm(false);
      setPage(1);
      fetchSocieties(debouncedSearch, 1, false);
    } catch (err) {
      setSocError(getErrorMessage(err, 'Failed to create society.'));
    } finally {
      setIsCreatingSoc(false);
    }
  };

  const handleMultiSelect = (socId) => {
    const currentArr = Array.isArray(value) ? value : [];
    if (currentArr.includes(socId)) {
      onChange(currentArr.filter((id) => id !== socId));
    } else {
      onChange([...currentArr, socId]);
    }
  };

  const handleSingleSelect = (socId) => {
    onChange(socId);
    setIsOpen(false);
  };

  const handleSelectAllAllowed = async () => {
    // If not all are loaded, we might need to fetch all or pass a special flag to the backend
    // Since we don't have a "select all" backend flag, we'll just select what's loaded, 
    // OR we could fetch all without pagination just for this. 
    // Let's assume selecting all currently fetched is what's possible, or we fetch all briefly.
    try {
      setIsLoading(true);
      const data = await getSocieties({ limit: 10000 }); // big limit to get all allowed
      const items = Array.isArray(data?.societies) ? data.societies : (Array.isArray(data) ? data : []);
      const currentArr = Array.isArray(value) ? value : [];
      if (currentArr.length === items.length && items.length > 0) {
        onChange([]);
      } else {
        onChange(items.map((soc) => soc._id || soc.id));
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectionText = () => {
    if (isMulti) {
      const currentArr = Array.isArray(value) ? value : [];
      if (currentArr.length === 0) return 'Select Society...';
      return `${currentArr.length} selected`;
    }
    // Single select text
    if (!value) return 'Select Society...';
    // We might not have the full object if it wasn't fetched, but try finding it
    const selectedSoc = societies.find(s => (s._id || s.id) === value);
    if (selectedSoc) return selectedSoc.name;
    return value; // fallback to ID
  };

  return (
    <div className="form-group mb-4" ref={dropdownRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label htmlFor={id}>{label}</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isMulti && (
            <button
              type="button"
              onClick={handleSelectAllAllowed}
              style={{
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                borderRadius: '6px',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--primary-color)',
                transition: 'all 0.2s ease',
              }}
            >
              Select All (Allowed Scope)
            </button>
          )}
          {allowInlineCreate && (
            <button
              type="button"
              className="stat-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => {
                setShowNewSocietyForm(!showNewSocietyForm);
                setSocError(null);
              }}
            >
              {showNewSocietyForm ? 'Cancel New Society' : 'Add New Society'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="alert alert-danger p-2 mb-2" style={{ fontSize: '0.8rem' }}>{error}</p>}

      {showNewSocietyForm ? (
         <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '6px' }}>
         <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>Create New Society Inline</h4>
         {socError && <p className="alert alert-danger p-2 mb-2" style={{ fontSize: '0.8rem' }}>{socError}</p>}
         <div className="form-group mb-2">
           <input
             type="text"
             placeholder="Society Name (e.g. Royal Heights)"
             value={newSocName}
             onChange={(e) => setNewSocName(e.target.value)}
           />
         </div>
         <div className="form-group mb-2">
           <input
             type="text"
             placeholder="Address (Optional)"
             value={newSocAddress}
             onChange={(e) => setNewSocAddress(e.target.value)}
           />
         </div>
         <button
           type="button"
           className="btn btn-sm btn-primary"
           onClick={handleInlineCreateSociety}
           disabled={isCreatingSoc}
         >
           {isCreatingSoc ? 'Creating Society...' : 'Save & Select Society'}
         </button>
       </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setIsOpen(!isOpen)}
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{renderSelectionText()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
            }}>
              <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <input
                  type="text"
                  placeholder="Search societies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-darker)', color: 'var(--text-main)' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div 
                style={{ maxHeight: '250px', overflowY: 'auto' }}
                onScroll={handleScroll}
              >
                {societies.length === 0 && !isLoading && (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No societies found
                  </div>
                )}
                {societies.map((soc) => {
                  const socId = soc._id || soc.id;
                  const currentArr = Array.isArray(value) ? value : [];
                  const isSelected = isMulti ? currentArr.includes(socId) : value === socId;

                  return (
                    <div
                      key={socId}
                      onClick={() => isMulti ? handleMultiSelect(socId) : handleSingleSelect(socId)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {isMulti && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          style={{ accentColor: 'var(--primary-color)' }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: isSelected ? '600' : 'normal' }}>{soc.name}</div>
                        {soc.address && <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{soc.address}</div>}
                      </div>
                    </div>
                  );
                })}
                {isLoading && (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocietySelect;
