import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import ProjectList from '../components/ProjectList';

function ProjectPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showProjectList, setShowProjectList] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [users, setUsers] = useState([]);
  
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assignedUser: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    createdFrom: '',
    createdTo: '',
    deadlineFrom: '',
    deadlineTo: ''
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedUsers: [],
    deadline: '',
    status: 'Not Started',
    createdAt: '',
    updatedAt: ''
  });

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      await fetchUsers();
      await fetchProjects();
    };
    verifyAuth();
  }, [navigate]);

  
  useEffect(() => {
    if (users.length > 0) { 
      fetchProjects();
    }
  }, [filters, pagination.page, pagination.pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/users/non-admin');
      console.log('Users API response:', response.data);

      const usersData = Array.isArray(response.data.data) 
        ? response.data.data 
        : Array.isArray(response.data) 
          ? response.data 
          : [];

      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      setError(`Failed to fetch users: ${errorMessage}`);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('Fetching projects with filters:', filters, 'page:', pagination.page);
      
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedUser) params.append('assignedUser', filters.assignedUser);
      if (filters.createdFrom) params.append('createdFrom', filters.createdFrom);
      if (filters.createdTo) params.append('createdTo', filters.createdTo);
      if (filters.deadlineFrom) params.append('deadlineFrom', filters.deadlineFrom);
      if (filters.deadlineTo) params.append('deadlineTo', filters.deadlineTo);

      const response = await axiosInstance.get(`/projects?${params.toString()}`);
      console.log('Projects API response:', response.data);
      
      if (!response.data || !Array.isArray(response.data.items)) {
        console.error('Invalid response format for projects:', response.data);
        throw new Error('Projects data format is invalid');
      }
      
      
      const projectsWithUsers = await Promise.all(response.data.items.map(async (project) => {
        if (!project) {
          console.error('Invalid project data:', project);
          return null;
        }

        const projectId = project.id || project._id;
        if (!projectId) {
          console.error('Project missing ID:', project);
          return null;
        }

        let processedProject = {
          _id: projectId,
          id: projectId,
          title: project.title || 'Untitled Project',
          description: project.description || '',
          status: project.status || 'Not Started',
          deadline: project.deadline || '',
          createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : '',
          updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : '',
          assignedUsers: []
        };

        try {
          if (project.assignedUsers && project.assignedUsers.length > 0) {
            if (typeof project.assignedUsers[0] === 'string') {
            
              const userPromises = project.assignedUsers.map(async (userId) => {
                try {
                  const userResponse = await axiosInstance.get(`/users/${userId}`);
                  return userResponse.data;
                } catch (err) {
                  console.error(`Error fetching user ${userId}:`, err);
                  return null;
                }
              });
              const fetchedUsers = await Promise.all(userPromises);
              processedProject.assignedUsers = fetchedUsers.filter(user => user !== null);
            } else {
           
              processedProject.assignedUsers = project.assignedUsers.filter(user => 
                user && (user._id || user.id)
              );
            }
          }
        } catch (err) {
          console.error('Error processing assigned users:', err);
          processedProject.assignedUsers = [];
        }

        return processedProject;
      }));

      const validProjects = projectsWithUsers.filter(project => 
        project && project._id && project.title
      );

      console.log(`Fetched ${validProjects.length} valid projects:`, validProjects);
      setProjects(validProjects);
      
      
      setPagination(prev => ({
        ...prev,
        totalCount: response.data.totalCount || 0,
        totalPages: response.data.totalPages || 0,
        hasNextPage: response.data.hasNextPage || false,
        hasPreviousPage: response.data.hasPreviousPage || false
      }));
      
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      console.error('Error details:', err.response?.data || err.message);
      
      let errorMessage;
      if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to view projects';
      } else if (err.response?.status === 404) {
        errorMessage = 'Projects endpoint not found';
      } else if (!err.response && err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to the server. Please check your connection.';
      } else {
        errorMessage = err.response?.data?.message || err.message;
      }
      
      setError(`Failed to fetch projects: ${errorMessage}`);
      
      if (err.response?.status === 401) {
        navigate('/login');
      }
      
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: newPageSize, 
      page: 1 
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      assignedUser: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      createdFrom: '',
      createdTo: '',
      deadlineFrom: '',
      deadlineTo: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'select-multiple') {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setFormData(prev => ({
        ...prev,
        [name]: selectedOptions
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!formData.title || formData.title.trim() === '') {
        setError('Project title is required');
        return;
      }

      const projectData = {
        title: formData.title.trim(),
        description: formData.description || '',
        assignedUsers: Array.isArray(formData.assignedUsers) 
          ? formData.assignedUsers.map(user => typeof user === 'object' ? (user._id || user.id) : user)
          : [],
        deadline: formData.deadline || '',
        status: formData.status || 'Not Started'
      };

      console.log(`Attempting to ${currentProject ? 'update' : 'create'} project with data:`, projectData);

      let response;
      if (currentProject) {
        console.log(`Sending PUT request to /projects/${currentProject._id}`);
        response = await axiosInstance.put(`/projects/${currentProject._id}`, projectData);
      } else {
        console.log('Sending POST request to /projects');
        response = await axiosInstance.post('/projects', projectData);
      }

      console.log(`API response:`, response);

      if (!response || !response.data) {
        throw new Error('No data received from server');
      }

      
      setFormData({
        title: '',
        description: '',
        assignedUsers: [],
        deadline: '',
        status: 'Not Started',
        createdAt: '',
        updatedAt: ''
      });
      setCurrentProject(null);
      setShowEditModal(false);
      setShowProjectList(true);
      
      setSuccess(currentProject 
        ? `Project "${formData.title}" updated successfully!` 
        : `Project "${formData.title}" created successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
     
      await fetchProjects();
    } catch (err) {
      console.error('Error saving project:', err);
      const errorMessage = err.response?.data?.message || err.message;
      setError(`Failed to save project: ${errorMessage}`);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      setLoading(true);
      setError(null);
      
      const projectToDelete = projects.find(p => p._id === projectId);
      if (!projectToDelete) {
        throw new Error(`Project with ID ${projectId} not found`);
      }
      
      await axiosInstance.delete(`/projects/${projectId}`);
      setSuccess(`Project "${projectToDelete.title}" deleted successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
      
      await fetchProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      const errorMessage = err.response?.data?.message || err.message;
      setError(`Failed to delete project: ${errorMessage}`);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    if (!project || !project._id) {
      console.error('Invalid project data for editing:', project);
      setError('Invalid project data. Please try again.');
      return;
    }

    setCurrentProject(project);
    setFormData({
      title: project.title || project.name || '',
      description: project.description || '',
      deadline: project.deadline ? project.deadline.split('T')[0] : '',
      status: project.status || 'Not Started',
      assignedUsers: project.assignedUsers || [],
      createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : '',
      updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : ''
    });
    setShowEditModal(true);
    setShowProjectList(false);
  };


 return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-pink-900">Project Management</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {showProjectList ? (
          <div>
            
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => {
                  setShowEditModal(true);
                  setShowProjectList(false);
                }}
                className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800"
              >
                Create New Project
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Search & Filters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search title or description..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned User</label>
                  <select
                    value={filters.assignedUser}
                    onChange={(e) => handleFilterChange('assignedUser', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user._id || user.id} value={user._id || user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="updatedAt">Updated Date</option>
                    <option value="title">Title</option>
                    <option value="status">Status</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>

                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created From</label>
                  <input
                    type="date"
                    value={filters.createdFrom}
                    onChange={(e) => handleFilterChange('createdFrom', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created To</label>
                  <input
                    type="date"
                    value={filters.createdTo}
                    onChange={(e) => handleFilterChange('createdTo', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline From</label>
                  <input
                    type="date"
                    value={filters.deadlineFrom}
                    onChange={(e) => handleFilterChange('deadlineFrom', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline To</label>
                  <input
                    type="date"
                    value={filters.deadlineTo}
                    onChange={(e) => handleFilterChange('deadlineTo', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

           
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} results
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>

           
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-900"></div>
                <p className="mt-2 text-gray-600">Loading projects...</p>
              </div>
            ) : (
              <ProjectList
                projects={projects}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}

           
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Total: {pagination.totalCount} projects
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
            
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.page - 2) + i;
                  if (pageNum <= pagination.totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 border rounded text-sm ${
                          pageNum === pagination.page
                            ? 'bg-pink-900 text-white border-pink-900'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {currentProject ? 'Edit Project' : 'Create New Project'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Project Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter project title"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows="4"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Assign Users</label>
                <div className="w-full border border-gray-300 rounded px-3 py-2 max-h-48 overflow-y-auto">
                  {users.length > 0 ? (
                    users.map(user => {
                      const isChecked = formData.assignedUsers?.some(assignedUser => 
                        (assignedUser._id || assignedUser.id || assignedUser) === (user._id || user.id)
                      );
                      
                      return (
                        <div key={user._id || user.id} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`user-${user._id || user.id}`}
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                assignedUsers: checked
                                  ? [...prev.assignedUsers, user]
                                  : prev.assignedUsers.filter(assignedUser => 
                                      (assignedUser._id || assignedUser.id || assignedUser) !== (user._id || user.id)
                                    )
                              }));
                            }}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          />
                          <label htmlFor={`user-${user._id || user.id}`} className="text-sm text-gray-700">
                            {user.name} ({user.email})
                          </label>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">No users available to assign</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setShowProjectList(true);
                    setCurrentProject(null);
                    setFormData({
                      title: '',
                      description: '',
                      deadline: '',
                      status: 'Not Started',
                      createdAt: '',
                      updatedAt: '',
                      assignedUsers: []
                    });
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (currentProject ? 'Update Project' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectPage;