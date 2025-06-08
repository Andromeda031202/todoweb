import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

const TaskPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [taskData, setTaskData] = useState({
    name: '',
    description: '',
    assignedUsers: [],
    startDate: '',
    endDate: '',
    status: 'Pending',
  });
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allProjectsWithTasks, setAllProjectsWithTasks] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
      navigate("/login");
      return;
    }
    
    if (!isInitialized) {
      initializeData();
      setIsInitialized(true);
    }
  }, [navigate, isInitialized]);

  useEffect(() => {
    if (selectedProjectId && isInitialized) {
      fetchTasksAndUsers();
    } else {
      setTasks([]);
      setAssignedUsers([]);
    }
  }, [selectedProjectId, isInitialized]);

  const initializeData = async () => {
    await fetchProjects();
  };

  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(message);
      setSuccess(null);
      setTimeout(() => setError(null), 5000);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const response = await axiosInstance.get('/api/projects?pageSize=1000');
      
      let projectsData = [];
      if (response.data && response.data.data) {
        
        projectsData = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response.data && response.data.items) {
        
        projectsData = Array.isArray(response.data.items) ? response.data.items : [];
      } else if (Array.isArray(response.data)) {
        
        projectsData = response.data;
      }
      
      setProjects(projectsData);
      setAllProjectsWithTasks(projectsData);
      setError(null);
      
      if (projectsData.length === 0) {
        showMessage('No projects found. Please create a project first.', 'error');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      const errorMessage = err.response?.data?.message || 
        err.response?.status === 401 ? 'Unauthorized' : 
        err.response?.status === 404 ? 'Projects not found' : 
        'Failed to load projects';
      
      showMessage(errorMessage, 'error');
      if (err.response?.status === 401) {
        navigate('/login');
      }
      setProjects([]);
      setAllProjectsWithTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksAndUsers = async () => {
    if (!selectedProjectId) return;
    
    setLoading(true);
    try {
      
      const tasksResponse = await axiosInstance.get(`/api/task/project/${selectedProjectId}`);
      const tasksData = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
      setTasks(tasksData);

      const usersResponse = await fetchProjectUsers(selectedProjectId);
      setAssignedUsers(usersResponse);
    } catch (err) {
      showMessage(`Error loading data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

 
  const fetchProjectUsers = async (projectId) => {
    try {
      
      const projectResponse = await axiosInstance.get(`/api/projects/${projectId}`);
      const project = projectResponse.data;
      
      
      const usersResponse = await axiosInstance.get('/api/users/non-admin');
      let allUsers = [];
      
      
      if (usersResponse.data.success && Array.isArray(usersResponse.data.data)) {
        allUsers = usersResponse.data.data;
      } else if (Array.isArray(usersResponse.data)) {
        allUsers = usersResponse.data;
      }
      
     
      const projectUsers = allUsers.map(user => ({
        _id: user.id || user._id,
        name: user.name || user.username || user.email || 'Unknown User'
      }));
      
      console.log('Fetched project users:', projectUsers);
      return projectUsers;
      
    } catch (err) {
      console.error('Error fetching project users:', err);
      
     
      try {
        const allUsersResponse = await axiosInstance.get('/api/users');
        let allUsers = [];
        
        if (allUsersResponse.data.success && Array.isArray(allUsersResponse.data.data)) {
          allUsers = allUsersResponse.data.data;
        } else if (Array.isArray(allUsersResponse.data)) {
          allUsers = allUsersResponse.data;
        }
        
        const nonAdminUsers = allUsers
          .filter(user => user.role !== 'admin')
          .map(user => ({
            _id: user.id || user._id,
            name: user.name || user.username || user.email || 'Unknown User'
          }));
          
        console.log('Fallback: fetched non-admin users:', nonAdminUsers);
        return nonAdminUsers;
        
      } catch (fallbackErr) {
        console.error('Fallback user fetch failed:', fallbackErr);
        return [];
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!taskData.name.trim()) {
      showMessage('Task name is required', 'error');
      return false;
    }
    
    if (!taskData.description.trim()) {
      showMessage('Task description is required', 'error');
      return false;
    }

    if (taskData.assignedUsers.length === 0) {
      showMessage('Please assign at least one user to the task', 'error');
      return false;
    }

    return validateDates();
  };

  const validateDates = () => {
    const today = new Date().toISOString().split('T')[0];
    
    if (taskData.startDate < today) {
      showMessage('Start date must be today or later.', 'error');
      return false;
    }

    if (taskData.endDate <= taskData.startDate) {
      showMessage('End date must be after start date.', 'error');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setTaskData({
      name: '',
      description: '',
      assignedUsers: [],
      startDate: '',
      endDate: '',
      status: 'Pending',
    });
    setEditingTask(null);
  };

  const updateProjectInOverview = async (projectId) => {
    try {
      const tasksResponse = await axiosInstance.get(`/api/task/project/${projectId}`);
      const projectTasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
      
      setAllProjectsWithTasks(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, tasks: projectTasks, hasTasks: projectTasks.length > 0 }
          : project
      ));
    } catch (err) {
      console.error('Failed to update project overview:', err);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      showMessage('Please select a project first', 'error');
      return;
    }
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const taskPayload = {
        name: taskData.name,
        description: taskData.description,
        status: taskData.status,
        projectId: selectedProjectId,
        assignedUsers: taskData.assignedUsers,
        startDate: taskData.startDate ? new Date(taskData.startDate).toISOString() : null,
        endDate: taskData.endDate ? new Date(taskData.endDate).toISOString() : null
      };

      if (editingTask) {
        
        const taskId = editingTask.id || editingTask._id;
        const response = await axiosInstance.put(`/api/task/${taskId}`, taskPayload);
        setTasks(prev => prev.map(task => 
          (task.id || task._id) === taskId 
            ? { ...response.data } 
            : task
        ));
        showMessage(`Task "${taskData.name}" updated successfully!`);
      } else {
        const response = await axiosInstance.post('/api/task', taskPayload);
        setTasks(prev => [...prev, response.data]);
        showMessage(`Task "${taskData.name}" created successfully!`);
      }

      resetForm();
      updateProjectInOverview(selectedProjectId);
    } catch (err) {
      showMessage(`Failed to ${editingTask ? 'update' : 'create'} task: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    if (!window.confirm(`Are you sure you want to change the task status to "${newStatus}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const task = tasks.find(t => (t.id || t._id) === taskId);
      const updatePayload = {
        name: task.name,
        description: task.description,
        status: newStatus,
        projectId: task.projectId,
        assignedUsers: task.assignedUsers || [],
        startDate: task.startDate,
        endDate: task.endDate
      };
      
      const response = await axiosInstance.put(`/api/task/${taskId}`, updatePayload);
      setTasks(prev => prev.map(t => (t.id || t._id) === taskId ? { ...response.data } : t));
      showMessage(`Task status updated to "${newStatus}"`);
      updateProjectInOverview(selectedProjectId);
    } catch (err) {
      showMessage(`Failed to update task status: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskData({
      name: task.name || '',
      description: task.description || '',
      assignedUsers: Array.isArray(task.assignedUsers) ? task.assignedUsers : [],
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      status: task.status || 'Pending',
    });
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    
    try {
      setLoading(true);
      await axiosInstance.delete(`/api/task/${taskId}`);
      setTasks(prev => prev.filter(task => (task.id || task._id) !== taskId));
      showMessage('Task deleted successfully!');
      updateProjectInOverview(selectedProjectId);
    } catch (err) {
      showMessage(`Failed to delete task: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserCheckboxChange = (userId) => {
    setTaskData(prev => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter(id => id !== userId)
        : [...prev.assignedUsers, userId]
    }));
  };

  const getUserNames = (task) => {
    if (!task.assignedUsers || task.assignedUsers.length === 0) return 'Unassigned';
    
    return task.assignedUsers.map(userId => {
      const user = assignedUsers.find(u => u._id === userId);
      return user ? user.name : userId;
    }).join(', ');
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'Pending': return 'In Progress';
      case 'In Progress': return 'Completed';
      case 'Completed': return 'Pending';
      default: return 'In Progress';
    }
  };

  const selectedProject = projects.find(p => (p.id || p._id) === selectedProjectId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-6">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-pink-900">Task Management</h1>
           <button
            onClick={() => navigate('/taskList')}
            className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-colors"
          >
           VIEW TASKLIST
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
            {error}
            <button 
              onClick={() => setError(null)}
              className="absolute top-1 right-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
            {success}
            <button 
              onClick={() => setSuccess(null)}
              className="absolute top-1 right-2 text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}

        
      

       
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-pink-900 mb-4">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h2>
          
          <form onSubmit={handleSubmitTask} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project *
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id || project._id} value={project.id || project._id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name *
              </label>
              <input
                type="text"
                name="name"
                value={taskData.name}
                onChange={handleInputChange}
                placeholder="Enter task name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={taskData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>

            
            {selectedProjectId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Users * {assignedUsers.length === 0 && <span className="text-red-500">(No users available)</span>}
                </label>
                {assignedUsers.length > 0 ? (
                  <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                    {assignedUsers.map((user) => (
                      <label key={user._id} className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={taskData.assignedUsers.includes(user._id)}
                          onChange={() => handleUserCheckboxChange(user._id)}
                          className="form-checkbox h-4 w-4 text-pink-600"
                        />
                        <span className="text-sm text-gray-700">{user.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-md p-3 text-center text-gray-500">
                    {loading ? 'Loading users...' : 'No users available for assignment'}
                  </div>
                )}
              </div>
            )}

            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={taskData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={taskData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={taskData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-pink-900 text-white py-2 px-4 rounded-md hover:bg-pink-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : (editingTask ? 'Update Task' : 'Create Task')}
              </button>
              {editingTask && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

     

        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-pink-900 mb-6">
            {selectedProject ? `Tasks for ${selectedProject.title}` : 'Select a Project to View Tasks'}
          </h2>

          {selectedProjectId ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-pink-50">
                    <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 border-b">
                      Task Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 border-b">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-pink-900 border-b">
                      Assigned User
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 border-b">
                      Start Date
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 border-b">
                      End Date
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 border-b">
                      Task Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-pink-900 border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-lg">
                        No tasks found for this project.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 border-b">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 text-sm">{task.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md" title={task.description}>
                            {task.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {getUserNames(task)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-gray-600">
                            {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-gray-600">
                            {task.endDate ? new Date(task.endDate).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={() => handleEditTask(task)}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleStatusChange(task.id, getNextStatus(task.status))}
                              className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                            >
                              → {getNextStatus(task.status)}
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
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
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg mb-2">Please select a project from the Projects Overview table above to view and manage tasks.</div>
              <div className="text-sm">Click the "Manage" button next to any project to get started.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskPage;