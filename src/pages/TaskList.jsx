import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

const TaskList = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); 
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    projectId: '',
    createdAfter: '',
    createdBefore: '',
    updatedAfter: '',
    updatedBefore: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const statusOptions = ['Pending', 'In Progress', 'Completed'];
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'status', label: 'Status' },
    { value: 'startdate', label: 'Start Date' },
    { value: 'enddate', label: 'End Date' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedat', label: 'Updated Date' }
  ];

  useEffect(() => {
    
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      navigate("/login");
      return;
    }
    
    fetchInitialData();
  }, [navigate]);

  useEffect(() => {
    if (!initialDataLoaded) return; 
    const timer = setTimeout(() => {
      fetchTasks();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, currentPage, pageSize, initialDataLoaded]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [projectRes, userRes] = await Promise.all([
        axiosInstance.get('projects?pageSize=1000'),
        axiosInstance.get('users')
      ]);

      
      const projectsData = projectRes.data?.items || projectRes.data?.data || [];
      
      
      let usersData = [];
      
      if (userRes.data?.data) {
        usersData = userRes.data.data;
      } else if (userRes.data?.items) {
        usersData = userRes.data.items;
      } else if (Array.isArray(userRes.data)) {
        usersData = userRes.data;
      } else {
        console.log('Trying paged users endpoint...');
        const pagedUserRes = await axiosInstance.get('users/paged?pageSize=1000');
        
        if (pagedUserRes.data?.data) {
          usersData = pagedUserRes.data.data;
        } else if (pagedUserRes.data?.items) {
          usersData = pagedUserRes.data.items;
        }
      }
      
      console.log('Fetched users:', usersData);
      console.log('Sample user structure:', usersData[0]);
      
      setProjects(projectsData);
      setUsers(usersData);
      setInitialDataLoaded(true); 
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setError(`Failed to load data: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setError(null);
      setTasksLoading(true); 
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.createdAfter) params.append('createdAfter', filters.createdAfter);
      if (filters.createdBefore) params.append('createdBefore', filters.createdBefore);
      if (filters.updatedAfter) params.append('updatedAfter', filters.updatedAfter);
      if (filters.updatedBefore) params.append('updatedBefore', filters.updatedBefore);
      
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);
      
      console.log('Request URL:', `task/paged?${params.toString()}`);
      
      const response = await axiosInstance.get(`task/paged?${params.toString()}`);
      
      console.log('Full API response:', response.data);
      
      
      const data = response.data;
      const tasksData = data.Tasks || data.tasks || [];
      const totalTasksCount = data.TotalTasks || data.totalTasks || 0;
      const totalPagesCount = data.TotalPages || data.totalPages || 0;
      
      console.log('Processed tasks data:', tasksData);
      console.log('Total tasks:', totalTasksCount);
      
      setTasks(tasksData);
      setTotalTasks(totalTasksCount);
      setTotalPages(totalPagesCount);
      
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      console.error('Error response:', error.response?.data);
      
      setError(`Failed to load tasks: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setTasksLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (initialDataLoaded) {
      fetchTasks();
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      projectId: '',
      createdAfter: '',
      createdBefore: '',
      updatedAfter: '',
      updatedBefore: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const getProjectName = (projectId) => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => (p._id || p.id) === projectId);
    return project ? (project.title || project.name) : 'Unknown Project';
  };

  const getUserNames = (task) => {
    if (!task.assignedUsers || task.assignedUsers.length === 0) {
      return 'Unassigned';
    }
    
    return task.assignedUsers.map(userId => {
      const user = users.find(u => (u._id || u.id) === userId);
      return user ? (user.name || user.username || user.email) : 'Unknown User';
    }).join(', ');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : '-';
  };

  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-900 mx-auto mb-4"></div>
          <p className="text-pink-900 font-medium">Loading initial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-pink-900">Task List</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/task')}
              className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-colors"
            >
              Manage Tasks
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 relative">
            {error}
            <button 
              onClick={() => setError(null)}
              className="absolute top-1 right-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters & Search</h2>
          
         
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search tasks by name or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                type="submit"
                className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

          
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project._id || project.id} value={project._id || project.id}>
                    {project.title || project.name}
                  </option>
                ))}
              </select>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

         
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created After</label>
              <input
                type="date"
                value={filters.createdAfter}
                onChange={(e) => handleFilterChange('createdAfter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created Before</label>
              <input
                type="date"
                value={filters.createdBefore}
                onChange={(e) => handleFilterChange('createdBefore', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Updated After</label>
              <input
                type="date"
                value={filters.updatedAfter}
                onChange={(e) => handleFilterChange('updatedAfter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Updated Before</label>
              <input
                type="date"
                value={filters.updatedBefore}
                onChange={(e) => handleFilterChange('updatedBefore', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {tasksLoading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-900 mr-3"></div>
              <span className="text-pink-900">Loading tasks...</span>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-pink-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Assigned Users
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!tasksLoading && tasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="text-lg font-medium">No tasks found</div>
                      <div className="text-sm mt-2">
                        {Object.values(filters).some(f => f) ? (
                          <span>Try adjusting your filters or 
                            <button
                              onClick={clearFilters}
                              className="text-pink-600 hover:text-pink-800 underline ml-1"
                            >
                              clear all filters
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => navigate('/task')}
                            className="text-pink-600 hover:text-pink-800 underline"
                          >
                            Create your first task
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task._id || task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{task.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{getProjectName(task.projectId)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={task.description}>
                          {task.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{getUserNames(task)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600">{formatDate(task.startDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600">{formatDate(task.endDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600">{formatDate(task.createdAt)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalTasks)} to {Math.min(currentPage * pageSize, totalTasks)} of {totalTasks} tasks
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === pageNum
                            ? 'bg-pink-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

       
        {tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-2xl font-bold text-pink-900">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {tasks.filter(t => t.status === 'Pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'In Progress').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'Completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;