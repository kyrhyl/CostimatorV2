'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  roles: string[];
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
};

const ROLE_OPTIONS = [
  { value: 'master_admin', label: 'Master Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'project_creator', label: 'Project Creator' },
  { value: 'viewer', label: 'Viewer' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    roles: ['viewer'],
    status: 'active' as 'active' | 'disabled',
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      setUsers(result.data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create user');
      }
      setForm({ email: '', name: '', password: '', roles: ['viewer'], status: 'active' });
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, update: Partial<User> & { password?: string }) => {
    try {
      const response = await fetch(`/api/admin/users/${id}` as string, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update user');
      }
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-gray-600">Create accounts and assign access levels.</p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            View Audit Logs
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Create User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.roles[0]}
                onChange={(e) => setForm({ ...form, roles: [e.target.value] })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'disabled' })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Users</h2>
            <button
              onClick={fetchUsers}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500">No users found.</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const userId = user._id || user.id || '';
                return (
                  <div key={userId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={user.roles[0]}
                          onChange={(e) => updateUser(userId, { roles: [e.target.value] })}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={user.status}
                          onChange={(e) => updateUser(userId, { status: e.target.value as 'active' | 'disabled' })}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                        </select>
                        <button
                          onClick={() => {
                            const password = window.prompt('Enter new password');
                            if (password) {
                              updateUser(userId, { password });
                            }
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
