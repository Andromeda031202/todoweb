import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const getLocalTasks = () => {
  try {
    const savedTasks = localStorage.getItem('localTasks');
    return savedTasks ? JSON.parse(savedTasks) : {};
  } catch (err) {
    console.error("Error parsing local tasks:", err);
    return {};
  }
};

function Dashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [stats, setStats] = useState({
    projects: "--",
    tasks: "--",
    users: "--",
    activeTasks: "--",
    completedTasks: "--",
    pendingTasks: "--"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token || role !== "admin") {
        navigate("/login");
        return;
      }

      try {
       
        await axiosInstance.get("/auth/check-admin-exists");
        setAdminName(user.name || "Admin");
        
        await fetchStats();
      } catch (err) {
        console.error("Admin verification failed:", err);
        localStorage.clear();
        delete axiosInstance.defaults.headers.common['Authorization'];
        navigate("/login");
      }
    };

    verifyAdmin();
  }, [navigate]);

  const fetchStats = async () => {
  setLoading(true);
  try {
    
    let projectCount = "--";
    let allProjects = [];
    try {
      const projectRes = await axiosInstance.get('projects');
      if (Array.isArray(projectRes.data?.items)) {
        allProjects = projectRes.data.items;
        projectCount = projectRes.data.items.length;
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }

    
    let taskCount = 0;
    let activeTaskCount = 0;
    let completedTaskCount = 0;
    let pendingTaskCount = 0;
    
    try {
      let allTasks = [];
      
      try {
        const taskRes = await axiosInstance.get('task/paged', { params: { page: 1, pageSize: 1000 } });
        const tasksData = taskRes.data?.Tasks || []; 
        allTasks = tasksData;
      } catch (err) {
        console.log("Error fetching tasks:", err);
      }      
      
      if (allTasks.length === 0 && allProjects.length > 0) {
        for (const project of allProjects) {
          try {
            const projectTasksRes = await axiosInstance.get(`/api/projects/${project._id}/tasks`);
            const projectTasks = Array.isArray(projectTasksRes.data) ? 
              projectTasksRes.data : 
              (projectTasksRes.data?.tasks && Array.isArray(projectTasksRes.data.tasks) ? 
              projectTasksRes.data.tasks : []);
              
            allTasks = [...allTasks, ...projectTasks];
          } catch (err) {
            console.log(`Could not fetch tasks for project ${project._id || project.title}`);
          }
        }
      }
      
      if (allTasks.length === 0) {
        const localTasksObj = getLocalTasks();
        
        for (const projectId in localTasksObj) {
          if (Array.isArray(localTasksObj[projectId])) {
            allTasks = [...allTasks, ...localTasksObj[projectId]];
          }
        }
      }
      
      taskCount = allTasks.length;
      
      if (allTasks.length > 0) {
        const statusCounts = allTasks.reduce((counts, task) => {
          const status = (task.status || '').toLowerCase();
          if (status === 'in progress') {
            counts.active++;
          } else if (status === 'completed') {
            counts.completed++;
          } else if (status === 'pending' || status === 'not started') {
            counts.pending++;
          }
          return counts;
        }, { active: 0, completed: 0, pending: 0 });
        
        activeTaskCount = statusCounts.active;
        completedTaskCount = statusCounts.completed;
        pendingTaskCount = statusCounts.pending;
      }
    } catch (err) {
      console.error("Error processing tasks:", err);
    }

    
    let userCount = "--";
    try {
      console.log("Attempting to fetch users...");
      
      
      try {
        const userStatsRes = await axiosInstance.get('users/stats');
        console.log("User stats response:", userStatsRes.data);
        
        if (userStatsRes.data?.totalUsers) {
          userCount = userStatsRes.data.totalUsers;
          console.log("Got user count from stats:", userCount);
        }
      } catch (statsErr) {
        console.log("Stats endpoint failed, trying paged endpoint...");
        
        
        try {
          const pagedUserRes = await axiosInstance.get('users/paged', { 
            params: { page: 1, pageSize: 1000 } 
          });
          console.log("Paged users response:", pagedUserRes.data);
          
          if (pagedUserRes.data?.data && Array.isArray(pagedUserRes.data.data)) {
            userCount = pagedUserRes.data.data.length;
            console.log("Got user count from paged endpoint:", userCount);
          } else if (pagedUserRes.data?.pagination?.totalItems) {
            userCount = pagedUserRes.data.pagination.totalItems;
            console.log("Got user count from pagination:", userCount);
          }
        } catch (pagedErr) {
          console.log("Paged endpoint failed, trying basic users endpoint...");
          
          
          try {
            const userRes = await axiosInstance.get('users');
            console.log("Basic users response:", userRes.data);
            
           
            if (Array.isArray(userRes.data?.data)) {
              userCount = userRes.data.data.length;
            } else if (Array.isArray(userRes.data)) {
              userCount = userRes.data.length;
            } else if (userRes.data?.items && Array.isArray(userRes.data.items)) {
              userCount = userRes.data.items.length;
            }
            
            console.log("Got user count from basic endpoint:", userCount);
          } catch (basicErr) {
            console.error("All user endpoints failed:", basicErr);
            
            
            if (basicErr.response?.status === 401) {
              console.error("Authorization failed - token might be invalid");
             
            } else if (basicErr.response?.status === 403) {
              console.error("Access forbidden - admin role required");
            }
          }
        }
      }
      
    } catch (err) {
      console.error("Error fetching users:", err);
      console.error("Error details:", err.response?.data);
    }

    setStats({
      projects: projectCount,
      tasks: taskCount,
      users: userCount,
      activeTasks: activeTaskCount,
      completedTasks: completedTaskCount,
      pendingTasks: pendingTaskCount
    });
  } catch (err) {
    console.error("Error fetching statistics:", err);
  } finally {
    setLoading(false);
  }
};

  const handleLogout = () => {
    localStorage.clear();
    delete axiosInstance.defaults.headers.common['Authorization'];
    navigate("/auth/login");
  };

  const menuItems = [
    {
      title: "Projects",
      description: "Manage and view all projects",
      path: "/projectPage",
      icon: "📁"
    },
    {
      title: "Tasks",
      description: "Track and assign tasks",
      path: "/taskPage",
      icon: "✓"
    },
    {
      title: "User List",
      description: "Manage system users",
      path: "/usersList",
      icon: "👥"
    }
  ];

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/to-do list bg admin.jpg')" }}
    >
      <div className="min-h-screen bg-black/35 backdrop-blur-[1px]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">
              Welcome, {adminName}!
            </h1>
           
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                to={item.path}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl hover:transform hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    {item.title}
                  </h2>
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Quick Stats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-pink-100 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-800">Total Projects</h3>
                  <p className="text-3xl font-bold text-pink-900">{loading ? "Loading..." : stats.projects}</p>
                </div>
                
                <div className="bg-green-100 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-800">Total Users</h3>
                  <p className="text-3xl font-bold text-green-900">{loading ? "Loading..." : stats.users}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
