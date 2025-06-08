import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import axios from "axios";

const getLocalTasks = () => {
  try {
    const savedTasks = localStorage.getItem('localTasks');
    return savedTasks ? JSON.parse(savedTasks) : {};
  } catch (err) {
    console.error("Error parsing local tasks:", err);
    return {};
  }
};

function UserDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      try {
       
    const token = localStorage.getItem("token");
        if (!token) {
          console.log("No token found, redirecting to login");
        navigate("/login");
        return;
      }

                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
                const role = localStorage.getItem("role");
        if (role === "admin") {
          console.log("Admin detected, redirecting to admin dashboard");
          navigate("/dashboard");
          return;
        }

                let userObject = null;
        
                try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const parsedUser = JSON.parse(userStr);
            if (parsedUser && (parsedUser._id || parsedUser.id)) {
              userObject = parsedUser;
              userObject._id = userObject._id || userObject.id;               console.log("User loaded from localStorage:", userObject.name);
            }
          }
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
        }
        
                if (!userObject || (!userObject._id && !userObject.id)) {
          console.log("No valid user in localStorage, trying API");
          try {
                        const endpoints = ['/users/current', '/users/me', '/user', '/auth/user'];
            
            for (const endpoint of endpoints) {
              try {
                console.log(`Trying to get user from ${endpoint}`);
                const userResponse = await axiosInstance.get(endpoint);
                
                if (userResponse.data && (userResponse.data._id || userResponse.data.id)) {
                  userObject = userResponse.data;
                  userObject._id = userObject._id || userObject.id;                   
                                    localStorage.setItem("user", JSON.stringify(userObject));
                  console.log("User loaded from API:", userObject.name);
                  break;
                }
              } catch (err) {
                console.log(`Failed to get user from ${endpoint}:`, err.message);
              }
            }
            
            if (!userObject || (!userObject._id && !userObject.id)) {
              throw new Error("Could not retrieve valid user data from API");
            }
          } catch (apiError) {
            console.error("Failed to get user from API:", apiError);
            throw new Error("Authentication failed. Please log in again.");
          }
        }
        
                if (!userObject.name) {
                    if (userObject.email) {
            const emailName = userObject.email.split('@')[0];
            userObject.name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          } else {
            userObject.name = "User";
          }
          
                    localStorage.setItem("user", JSON.stringify(userObject));
        }
        
                setUserData(userObject);
        await fetchUserData(userObject._id || userObject.id);
      } catch (err) {
        console.error("User verification failed:", err);
        setError(err.message || "Authentication failed. Please log in again.");
        
                localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        delete axiosInstance.defaults.headers.common['Authorization'];
        navigate("/login");
      }
    };

    verifyUser();
  }, [navigate]);

  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        setError("User ID not found. Please log in again.");
        return;
      }

      console.log(`Fetching data for user ${userId}`);

            let projectsData = [];
      let projectsAcquired = false;
      
            const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
      const userName = userInfo.name || "User";
      console.log(`Fetching data for user: ${userName} (ID: ${userId})`);
      
            const projectEndpoints = [
        `/api/projects?assignedUser=${userId}`,
        `/api/projects`
      ];
      
      console.log("Attempting to fetch projects for user...");
      
      for (const endpoint of projectEndpoints) {
        if (projectsAcquired) break;
        
        try {
          console.log(`Trying to fetch projects from ${endpoint}`);
          const projectsRes = await axiosInstance.get(endpoint);
          
          if (Array.isArray(projectsRes.data)) {
            projectsData = projectsRes.data;
            console.log(`Projects fetched from ${endpoint}: ${projectsData.length} projects`);
            if (projectsData.length > 0) {
              projectsAcquired = true;
            }
          } else if (projectsRes.data && Array.isArray(projectsRes.data.items)) {
            projectsData = projectsRes.data.items;
            console.log(`Projects fetched from ${endpoint}.items: ${projectsData.length} projects`);
            if (projectsData.length > 0) {
              projectsAcquired = true;
            }
          }
        } catch (err) {
          console.log(`Failed to fetch projects from ${endpoint}:`, err.message);
        }
      }
      
            if (!projectsData || projectsData.length === 0) {
        console.log("No projects found via API");
        projectsData = [];
      }
      
            const processedProjects = projectsData.map(project => ({
        _id: project._id || project.id || 'proj_' + Math.random().toString(36).substr(2, 9),
        title: project.title || project.name || 'Untitled Project',
        description: project.description || '',
        status: project.status || 'Pending',
        deadline: project.deadline || null,
        ...project
      }));
      
      setProjects(processedProjects);
      console.log(`Loaded ${processedProjects.length} projects`);

            let tasksData = [];
      let tasksAcquired = false;
      
            const taskEndpoints = [
        `/api/tasks?assignedUser=${userId}`,
        `/api/tasks`
      ];
      
      console.log("Attempting to fetch tasks for user:", userId);
      
            for (const endpoint of taskEndpoints) {
            if (tasksAcquired) break;
            
            try {
              console.log(`Trying to fetch tasks from ${endpoint}`);
              const tasksRes = await axiosInstance.get(endpoint);
              
              if (Array.isArray(tasksRes.data)) {
                tasksData = tasksRes.data;
                console.log(`Tasks fetched from ${endpoint}: ${tasksData.length} tasks`);
                if (tasksData.length > 0) {
                  tasksAcquired = true;
                }
              } else if (tasksRes.data && Array.isArray(tasksRes.data.items)) {
                tasksData = tasksRes.data.items;
                console.log(`Tasks fetched from ${endpoint}.items: ${tasksData.length} tasks`);
                if (tasksData.length > 0) {
                  tasksAcquired = true;
                }
              }
            } catch (err) {
              console.log(`Failed to fetch tasks from ${endpoint}:`, err.message);
            }
          }         if (!tasksAcquired || tasksData.length === 0) {
        console.log("Getting tasks directly from projects");
        
        let projectTasksFound = [];
        
                for (const project of processedProjects) {
          try {
            const projectId = project._id;
            console.log(`Looking for tasks in project ${project.title} (${projectId})`);
            
                        try {
              const tasksRes = await axiosInstance.get(`/projects/${projectId}/tasks`);
              if (Array.isArray(tasksRes.data)) {
                const projectTasks = tasksRes.data.filter(task => {
                                    if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
                    return task.assignedUsers.some(user => {
                      if (typeof user === 'string') return user === userId;
                      return (user._id === userId || user.id === userId);
                    });
                  }
                  return false;
                });
                
                if (projectTasks.length > 0) {
                  projectTasksFound = [...projectTasksFound, ...projectTasks];
                  console.log(`Found ${projectTasks.length} tasks for user in project ${project.title}`);
                }
              }
            } catch (err) {
              console.log(`Could not get tasks for project ${projectId}:`, err.message);
            }
          } catch (err) {
            console.error(`Error processing project ${project._id}:`, err);
          }
        }
        
                if (projectTasksFound.length > 0) {
          tasksData = projectTasksFound;
          tasksAcquired = true;
        }
      }
      
            if (!tasksData || tasksData.length === 0) {
        console.log("No tasks found via API");
        tasksData = [];
      }
      
            const processedTasks = tasksData.map(task => {
                const taskProject = processedProjects.find(p => 
          p._id === (task.projectId || task.project?._id || task.project)
        );
        
        return {
          _id: task._id || task.id || 'task_' + Math.random().toString(36).substr(2, 9),
          name: task.name || task.title || 'Untitled Task',
          description: task.description || '',
          status: task.status || 'Pending',
          projectId: task.projectId || task.project?._id || task.project || (taskProject ? taskProject._id : null),
          projectTitle: taskProject ? taskProject.title : 'Unknown Project',
          startDate: task.startDate || task.start_date || '',
          endDate: task.endDate || task.end_date || task.deadline || '',
          ...task
        };
      });
      
      setTasks(processedTasks);
      console.log(`Loaded ${processedTasks.length} tasks`);
      
            setUserData(prev => ({
        ...prev,
        projectCount: processedProjects.length,
        taskCount: processedTasks.length,
        pendingTaskCount: processedTasks.filter(task => 
          task.status === 'Pending' 
        ).length
      }));
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(`Failed to load user data: ${err.message}`);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    delete axiosInstance.defaults.headers.common['Authorization'];
    navigate("/login");
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
     
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

 const handleUpdateTaskStatus = async (taskId, newStatus) => {
  try {
    setLoading(true);
    setError(null);
    
    const taskToUpdate = tasks.find(t => t._id === taskId);
    if (!taskToUpdate) {
      setError(`Task with ID ${taskId} not found`);
      setLoading(false);
      return;
    }
    
    console.log(`🔄 Updating task ${taskId} status from ${taskToUpdate.status} to ${newStatus}`);
    console.log(`📋 Task details:`, {
      name: taskToUpdate.name,
      projectId: taskToUpdate.projectId,
      projectTitle: taskToUpdate.projectTitle
    });
    
    const payload = { 
      status: newStatus,
      name: taskToUpdate.name,
      description: taskToUpdate.description || ""
    };
    
    console.log(`📦 Payload:`, payload);
    console.log(`🔗 Axios baseURL:`, axiosInstance.defaults.baseURL);
    console.log(`🔑 Has Authorization header:`, !!axiosInstance.defaults.headers.common['Authorization']);
    
    
    const endpointsToTry = [
      `/api/tasks/${taskId}`,      
      `/tasks/${taskId}`,          
      `/api/task/${taskId}`,      
      `/task/${taskId}`,           
    ];
    
    let lastError = null;
    let success = false;
    
    for (let i = 0; i < endpointsToTry.length; i++) {
      const endpoint = endpointsToTry[i];
      console.log(`🎯 Trying endpoint ${i + 1}/${endpointsToTry.length}: ${endpoint}`);
      
      try {
        
        console.log(`📤 Attempting PUT request to ${endpoint}`);
        const response = await axiosInstance.put(endpoint, payload);
        
        console.log(`✅ PUT Success!`, {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
        
        
        const updatedTasks = tasks.map(task => 
          task._id === taskId ? {...task, ...response.data, status: newStatus} : task
        );
        setTasks(updatedTasks);
        
        
        setUserData(prev => ({
          ...prev,
          pendingTaskCount: updatedTasks.filter(task => 
            task.status === 'Pending' 
          ).length
        }));
        
        setSuccess(`✅ Task "${taskToUpdate.name}" status updated to "${newStatus}" and synced with server`);
        setTimeout(() => setSuccess(null), 3000);
        
        success = true;
        break;
        
      } catch (putError) {
        console.log(`❌ PUT failed for ${endpoint}:`, {
          status: putError.response?.status,
          statusText: putError.response?.statusText,
          message: putError.message,
          data: putError.response?.data
        });
        
       
        try {
          console.log(`📤 Attempting PATCH request to ${endpoint}`);
          const response = await axiosInstance.patch(endpoint, payload);
          
          console.log(`✅ PATCH Success!`, {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          });
          
          
          const updatedTasks = tasks.map(task => 
            task._id === taskId ? {...task, ...response.data, status: newStatus} : task
          );
          setTasks(updatedTasks);
          
          
          setUserData(prev => ({
            ...prev,
            pendingTaskCount: updatedTasks.filter(task => 
              task.status.toLowerCase() === 'pending' 
            ).length
          }));
          
          setSuccess(`✅ Task "${taskToUpdate.name}" status updated to "${newStatus}" and synced with server`);
          setTimeout(() => setSuccess(null), 3000);
          
          success = true;
          break;
          
        } catch (patchError) {
          console.log(`❌ PATCH also failed for ${endpoint}:`, {
            status: patchError.response?.status,
            statusText: patchError.response?.statusText,
            message: patchError.message,
            data: patchError.response?.data
          });
          
          lastError = patchError;
          
         
          if (patchError.response?.status === 404) {
            console.log(`⏭️ 404 error, trying next endpoint...`);
            continue;
          }
          
          
          if (patchError.response?.status !== 404) {
            lastError = patchError;
            break; 
          }
        }
      }
    }
    
    if (!success) {
      
      let errorMessage = "Failed to update task on server. ";
      let shouldUpdateLocally = false;
      
      if (lastError) {
        const status = lastError.response?.status;
        const responseData = lastError.response?.data;
        
        console.log(`❌ Final error analysis:`, {
          status,
          message: lastError.message,
          responseData
        });
        
        switch (status) {
          case 404:
            errorMessage += "API endpoint not found. Check if your backend server has the correct routes.";
            shouldUpdateLocally = true;
            break;
          case 401:
            errorMessage += "Authentication failed. Please log in again.";
            
            localStorage.removeItem("token");
            navigate("/login");
            return;
          case 403:
            errorMessage += "You don't have permission to update this task.";
            break;
          case 400:
            errorMessage += `Bad request: ${responseData?.message || 'Invalid data sent to server'}`;
            break;
          case 500:
            errorMessage += "Server error. Please try again later or contact support.";
            shouldUpdateLocally = true;
            break;
          default:
            if (lastError.message.includes('Network Error')) {
              errorMessage += "Cannot connect to server. Check your internet connection and server status.";
              shouldUpdateLocally = true;
            } else {
              errorMessage += `Server responded with status ${status}: ${responseData?.message || lastError.message}`;
              shouldUpdateLocally = true;
            }
        }
        
        
        errorMessage += `\n\n🔍 Debug Info:\n`;
        errorMessage += `• Endpoints tried: ${endpointsToTry.join(', ')}\n`;
        errorMessage += `• Base URL: ${axiosInstance.defaults.baseURL || 'Not set'}\n`;
        errorMessage += `• Last error: ${status} - ${lastError.message}`;
        
      } else {
        errorMessage += "Unknown error occurred.";
        shouldUpdateLocally = true;
      }
      
      if (shouldUpdateLocally) {
        
        const updatedTasks = tasks.map(task => 
          task._id === taskId ? {...task, status: newStatus} : task
        );
        setTasks(updatedTasks);
        
        errorMessage += "\n\n✅ Task updated locally.";
      }
      
      setError(errorMessage);
    }
    
  } catch (err) {
    console.error("❌ Critical error in task update:", err);
    setError(`Critical error: ${err.message}`);
  } finally {
    setLoading(false);
  }
};


const debugBackendConnection = async () => {
  console.log("🔧 === BACKEND CONNECTION DEBUG ===");
  console.log("Base URL:", axiosInstance.defaults.baseURL);
  console.log("Token present:", !!localStorage.getItem('token'));
  console.log("Authorization header:", axiosInstance.defaults.headers.common['Authorization']);
  
 
  const testEndpoints = ['/', '/api', '/health', '/tasks', '/api/tasks'];
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await axiosInstance.get(endpoint);
      console.log(`✅ ${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Network Error'} - ${error.message}`);
    }
  }
  
  console.log("🔧 === END DEBUG ===");
};


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-900"></div>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
      
        {userData && (
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-pink-900 border-b-4 border-pink-500 pb-2 inline-block">
              WELCOME {userData.name?.toUpperCase() || userData.username?.toUpperCase() || 'USER'}!
            </h1>
            <p className="text-gray-600 mt-2">Here's an overview of your projects and tasks</p>
          </div>
        )}

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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-900"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6 transform hover:scale-[1.01] transition-all">
                <h2 className="text-lg font-semibold text-pink-900 mb-2">Projects</h2>
                <div className="text-3xl font-bold text-pink-900">{userData?.projectCount || 0}</div>
                <p className="text-gray-600 mt-2">Total projects assigned to you</p>
          </div>

              <div className="bg-white rounded-lg shadow-lg p-6 transform hover:scale-[1.01] transition-all">
                <h2 className="text-lg font-semibold text-pink-900 mb-2">Tasks</h2>
                <div className="text-3xl font-bold text-pink-900">{userData?.taskCount || 0}</div>
                <p className="text-gray-600 mt-2">Total tasks assigned to you</p>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 transform hover:scale-[1.01] transition-all">
                <h2 className="text-lg font-semibold text-pink-900 mb-2">Pending Tasks</h2>
                <div className="text-3xl font-bold text-pink-900">{userData?.pendingTaskCount || 0}</div>
                <p className="text-gray-600 mt-2">Tasks waiting for completion</p>
              </div>
            </div>

          
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-pink-900">Your Projects</h2>
                <button
                  className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-all"
                  onClick={() => navigate('/projects')}
                >
                  View All Projects
                </button>
          </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.slice(0, 3).map((project) => (
                    <div
                      key={project._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/projects/${project._id}`)}
                    >
                      <h3 className="font-semibold text-pink-900 mb-2">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {project.description || "No description provided"}
                      </p>
                      <div className="text-xs text-gray-500">
                        {project.assignedUsers?.length || 0} team members
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No projects assigned to you yet.</p>
                </div>
              )}
          </div>

         
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-pink-900">Your Tasks</h2>
                <button
                  className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-all"
                  onClick={() => navigate('/tasks')}
                >
                  View All Tasks
                </button>
      </div>

              {tasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="py-2 px-3 text-left">Task</th>
                        <th className="py-2 px-3 text-left">Project</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.slice(0, 5).map((task) => (
                        <tr key={task._id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-3">{task.name}</td>
                          <td className="py-3 px-3">{task.projectTitle}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              value={task.status}
                              onChange={(e) =>
                                handleUpdateTaskStatus(task._id, e.target.value)
                              }
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No tasks assigned to you yet.</p>
  </div>
              )}
          </div>
          </>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;