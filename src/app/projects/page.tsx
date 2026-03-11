'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  _id: string;
  projectName: string;
  projectLocation: string;
  district?: string;
  implementingOffice?: string;
  appropriation: number;
  contractId?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  estimatesCount?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const STATUS_COLORS = {
  Planning: 'bg-blue-100 text-blue-800',
  Approved: 'bg-green-100 text-green-800',
  Ongoing: 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (locationFilter) params.append('location', locationFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/projects?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setProjects(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [searchTerm, statusFilter, locationFilter, pagination.page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated BOQ items.')) return;
    
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchProjects();
      } else {
        alert('Failed to delete project: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const handleDuplicateClick = (project: Project) => {
    setSelectedProject(project);
    setNewProjectName(`${project.projectName} (Copy)`);
    setDuplicateModalOpen(true);
  };

  const handleDuplicate = async () => {
    if (!selectedProject || !newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${selectedProject._id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: newProjectName.trim(),
          projectLocation: selectedProject.projectLocation,
          copyGrid: true,
          copyLevels: true,
          copyElementTemplates: true,
          copyElementInstances: true,
          copySettings: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDuplicateModalOpen(false);
        setSelectedProject(null);
        setNewProjectName('');
        
        // Redirect to edit page for the new project
        if (confirm(`Project duplicated successfully!\n\nWould you like to edit "${newProjectName}" now to make adjustments?`)) {
          router.push(`/projects/${result.data._id}/edit`);
        } else {
          fetchProjects();
        }
      } else {
        alert('Failed to duplicate project: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      alert('Failed to duplicate project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage construction projects with location-based BOQ</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Projects
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, contract ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="Planning">Planning</option>
                <option value="Approved">Approved</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Location
              </label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter by location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {projects.length} of {pagination.total} projects
            </div>
            <Link
              href="/projects/new"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              + New Project
            </Link>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <div className="text-lg">Loading projects...</div>
                      </div>
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div>
                        <p className="text-lg mb-2">No projects found</p>
                        <p className="text-sm">
                          {searchTerm || statusFilter || locationFilter
                            ? 'Try adjusting your filters'
                            : 'Create your first project to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/projects/${project._id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {project.projectName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {project.projectLocation}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {project.contractId || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₱{project.appropriation?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            STATUS_COLORS[project.status as keyof typeof STATUS_COLORS]
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {project.estimatesCount || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-3">
                          <Link
                            href={`/projects/${project._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDuplicateClick(project)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDelete(project._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Project Modal */}
      {duplicateModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Duplicate Project
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Source Project: <span className="font-medium">{selectedProject.projectName}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This will copy the grid system, levels, element templates, and instances. 
                Calculations and cost estimates will NOT be copied and must be regenerated.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Project Name *
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter new project name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setDuplicateModalOpen(false);
                  setSelectedProject(null);
                  setNewProjectName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Duplicate Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
