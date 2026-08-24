// src/pages/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { getResidents, getGuards, getServices, getFamilyMembers } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../components/ConfirmDialog";
import DetailModal from "../components/DetailModal";
import SocietySelect from "../components/SocietySelect";

// Utility to map identity to API calls
const identityMap = {
  resident: {
    fetch: getResidents,
    label: "Resident",
    addComponent: "AddResidentModal",
  },
  guard: {
    fetch: getGuards,
    label: "Guard",
    addComponent: "AddGuardModal",
  },
  service: {
    fetch: getServices,
    label: "Service Provider",
    addComponent: "AddServiceModal",
  },
  family: {
    fetch: getFamilyMembers,
    label: "Family Member",
    addComponent: "AddFamilyMemberModal",
  },
};

const Users = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [activeIdentity, setActiveIdentity] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [residents, guards, services, family] = await Promise.all([
          getResidents(),
          getGuards(),
          getServices(),
          getFamilyMembers(),
        ]);
        setData({ residents, guards, services, family });
      } catch (err) {
        setError(err.message || "Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
  }, []);

  // Filtered list based on active tab and search
  const filteredItems = useMemo(() => {
    const allItems = [];
    if (activeIdentity === "all" || activeIdentity === "resident") {
      allItems.push(...(data.residents || []));
    }
    if (activeIdentity === "all" || activeIdentity === "guard") {
      allItems.push(...(data.guards || []));
    }
    if (activeIdentity === "all" || activeIdentity === "service") {
      allItems.push(...(data.services || []));
    }
    if (activeIdentity === "all" || activeIdentity === "family") {
      allItems.push(...(data.family || []));
    }
    if (!search) return allItems;
    const lower = search.toLowerCase();
    return allItems.filter((item) => {
      return (
        (item.fullName || item.name || "").toLowerCase().includes(lower) ||
        (item.email || "").toLowerCase().includes(lower) ||
        (item.phone || "").toLowerCase().includes(lower)
      );
    });
  }, [activeIdentity, data, search]);

  // Count per identity for tabs
  const counts = {
    all:
      (data.residents?.length || 0) +
      (data.guards?.length || 0) +
      (data.services?.length || 0) +
      (data.family?.length || 0),
    resident: data.residents?.length || 0,
    guard: data.guards?.length || 0,
    service: data.services?.length || 0,
    family: data.family?.length || 0,
  };

  // Handlers for CRUD actions (placeholders – actual modals/logic similar to other pages)
  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item) => setDeleteTarget(item);

  const handleConfirmDelete = async () => {
    // Placeholder: call appropriate delete API based on item type
    setDeleteTarget(null);
    // Refresh data after deletion (omitted for brevity)
  };

  if (isLoading) {
    return (
      <div className="card-box">
        <h3>Loading Users...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">{error}</div>
    );
  }

  const handleOpenDetail = (item) => {
    // Normalize fields for cleaner presentation in DetailModal
    const normalized = {
      name: item.fullName || item.name || "N/A",
      phone: item.phone || item.mobile || "N/A",
      email: item.email || "N/A",
      role: item.role || (item.isGuard ? "Guard" : item.serviceType ? "Service Provider" : "Resident"),
      society: typeof item.society === "object" ? item.society?.name || "N/A" : item.society || "N/A",
    };
    if (item.flatNumber || item.flat) normalized.flatNumber = item.flatNumber || item.flat;
    if (item.relation || item.relationship) normalized.relation = item.relation || item.relationship;
    if (item.age) normalized.age = item.age;
    if (item.employeeId) normalized.employeeId = item.employeeId;
    if (item.serviceType) normalized.serviceType = item.serviceType;
    if (item.costPerMonth) normalized.costPerMonth = item.costPerMonth;
    
    setDetailItem(normalized);
    setIsDetailOpen(true);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <h1 className="page-title">Users Management</h1>
        <p className="page-description" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '800px', margin: '0 0 16px 0' }}>
          Efficiently manage your society network. Handle residents, family members, guards, and service providers profile, monitor their activity status, and manage access permissions from a single interface.
        </p>

        {/* Top pill action buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button onClick={handleAdd} style={{ background: 'var(--info-bg)', color: 'var(--info)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-fast)' }}>Add Resident</button>
          <button onClick={handleAdd} style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-fast)' }}>Add Guard</button>
          <button onClick={handleAdd} style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-fast)' }}>Add Family Member</button>
          <button onClick={handleAdd} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-fast)' }}>Add Service Provider</button>
        </div>

        <div className="action-buttons-group" style={{ display: 'flex', gap: '12px', width: '100%' }}>
          {!isSuperAdmin && (
            <button className="btn btn-outline" onClick={() => alert("Support contact form TBD")} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
              Support
            </button>
          )}
          <button className="btn btn-primary" onClick={handleAdd} style={{ borderRadius: '8px' }}>
            + Add New
          </button>
        </div>
      </div>

      <div className="table-controls-card" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: '0', padding: '0 0 16px 0', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs" style={{ display: 'flex', gap: '24px', flex: 1, borderBottom: 'none', flexWrap: 'wrap' }}>
          {Object.entries(counts).map(([key, count]) => (
            <div
              key={key}
              onClick={() => setActiveIdentity(key)}
              style={{
                cursor: 'pointer',
                paddingBottom: '8px',
                fontWeight: activeIdentity === key ? '600' : '500',
                color: activeIdentity === key ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeIdentity === key ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
            >
              {key === 'all' ? 'All Users' : (key === 'resident' ? 'Residents' : (key === 'guard' ? 'Guards' : (key === 'service' ? 'Services' : 'Family')))}
              <span style={{
                background: activeIdentity === key ? 'var(--primary-light)' : 'var(--bg-dark)',
                color: activeIdentity === key ? 'var(--primary)' : 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {count}
              </span>
            </div>
          ))}
        </div>
        
        <div className="search-box" style={{ flex: 'none', width: '280px' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: '8px', padding: '8px 36px 8px 36px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          />
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>FULL NAME</th>
              <th style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>EMAIL</th>
              <th style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>PHONE</th>
              <th style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>ROLE</th>
              <th style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>STATUS</th>
              <th style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id || item.id} className="table-row-hover" style={{ background: 'var(--bg-card)' }}>
                <td className="user-name-cell" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.85rem' }}>
                    {(item.fullName || item.name || "U").substring(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.fullName || item.name}</span>
                </td>
                <td style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '16px' }}>{item.email || "—"}</td>
                <td style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '16px' }}>{item.phone || "—"}</td>
                <td style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {item.role || (item.isGuard ? "Guard" : item.serviceType || "Resident")}
                  </span>
                </td>
                <td style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
                  <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                    Active
                  </span>
                </td>
                <td className="action-buttons-group" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px', justifyContent: 'flex-end' }}>
                  <button className="icon-action-btn icon-action-btn-view" title="View Details" onClick={() => handleOpenDetail(item)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button className="icon-action-btn icon-action-btn-edit" title="Edit" onClick={() => handleEdit(item)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="icon-action-btn icon-action-btn-delete" title="Delete" onClick={() => handleDelete(item)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals (Add/Edit) – placeholder components can be reused from Residents/Guards pages */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Render appropriate add/edit component based on activeIdentity */}
            <h3>{editingItem ? `Edit ${identityMap[activeIdentity]?.label || "User"}` : `Add New ${identityMap[activeIdentity]?.label || "User"}`}</h3>
            {/* TODO: Integrate actual form components for each identity */}
            <p className="text-muted">Form implementation pending.</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      <DetailModal
        isOpen={isDetailOpen}
        title="User Details"
        data={detailItem}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete User"
          message={`Are you sure you want to delete ${deleteTarget.fullName || deleteTarget.name}?`}
          confirmText="Delete"
          isDeleting={false}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default Users;
