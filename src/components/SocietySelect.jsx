import { useState } from 'react';
import { createSociety } from '../api/admin';
import { useSocieties } from '../hooks/useSocieties';
import { getErrorMessage } from '../utils/getErrorMessage';

const SocietySelect = ({
  value,
  onChange,
  required = false,
  id = 'societySelect',
  allowInlineCreate = false,
  label = 'Assigned Society',
  isMulti = false
}) => {
  const { societies, isLoading, error, refetchSocieties } = useSocieties(true);

  const [showNewSocietyForm, setShowNewSocietyForm] = useState(false);
  const [newSocName, setNewSocName] = useState('');
  const [newSocAddress, setNewSocAddress] = useState('');
  const [isCreatingSoc, setIsCreatingSoc] = useState(false);
  const [socError, setSocError] = useState(null);

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

      await refetchSocieties();
      const createdId = newSoc?._id || newSoc?.id;
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

  const handleSelectAll = () => {
    const currentArr = Array.isArray(value) ? value : [];
    if (currentArr.length === societies.length && societies.length > 0) {
      // Deselect all
      onChange([]);
    } else {
      // Select all
      onChange(societies.map((soc) => soc._id || soc.id));
    }
  };

  return (
    <div className="form-group mb-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label htmlFor={id}>{label}</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isMulti && (
            <button
              type="button"
              onClick={handleSelectAll}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)';
              }}
            >
              {Array.isArray(value) && value.length === societies.length && societies.length > 0 ? 'Deselect All' : 'Select All'}
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
      ) : isMulti ? (
        <div 
          style={{ 
            maxHeight: '260px', 
            overflowY: 'auto', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            backgroundColor: 'var(--bg-dark)',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px'
          }}
        >
          {isLoading ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading societies...</span>
          ) : societies.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No societies available.</span>
          ) : (
            societies.map((soc) => {
              const socId = soc._id || soc.id;
              const currentArr = Array.isArray(value) ? value : [];
              const isSelected = currentArr.includes(socId);
              return (
                <label 
                  key={socId} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '10px', 
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'var(--bg-darker)',
                    border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease',
                    margin: 0,
                    boxShadow: isSelected ? '0 4px 12px rgba(14, 165, 233, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-darker)';
                    }
                  }}
                >
                  <div style={{ paddingTop: '2px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMultiSelect(socId)}
                      style={{ 
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                        accentColor: 'var(--primary-color)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? 'var(--primary-color)' : 'var(--text-main)',
                      lineHeight: '1.2'
                    }}>
                      {soc.name}
                    </span>
                    {soc.address && (
                      <span style={{
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)',
                        lineHeight: '1.2'
                      }}>
                        {soc.address}
                      </span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
      ) : (
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'var(--bg-dark)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
          required={required}
        >
          <option value="">{isLoading ? 'Loading societies...' : 'Select Society...'}</option>
          {societies.map((soc) => {
            const socId = soc._id || soc.id;
            return (
              <option key={socId} value={socId}>
                {soc.name} {soc.address ? `(${soc.address})` : ''}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
};

export default SocietySelect;
