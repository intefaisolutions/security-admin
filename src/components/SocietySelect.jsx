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
  label = 'Assigned Society'
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
        onChange(createdId);
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

  return (
    <div className="form-group mb-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label htmlFor={id}>{label}</label>
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
