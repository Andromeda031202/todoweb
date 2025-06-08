import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const UsersList = () => {
  const navigate = useNavigate();
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userType, setUserType] = useState("all"); 
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get("/projects");
      if (Array.isArray(res.data)) {
        const processedProjects = res.data.map(project => ({
          ...project,
          title: project.title || project.name || 'Untitled Project',
          _id: project._id || project.id
        })).filter(project => project._id);
        setProjects(processedProjects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to fetch projects. Please try again.");
    }
  };

  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      
      const params = {
        page: currentPage,
        pageSize: pageSize,
        sortBy: sortBy,
        sortOrder: sortOrder
      };
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      if (userType !== "all") {
        params.role = userType;
      }

      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

     
      if (userType !== "all") {
        params.role = userType;
      }

      console.log("Fetching users with params:", params);

      const response = await axiosInstance.get("/users/paged", { params });
      
      if (response.data && response.data.success) {
        const { data: usersData, pagination } = response.data;
        
        setUsers(usersData || []);
        setCurrentPage(pagination.currentPage);
        setTotalPages(pagination.totalPages);
        setTotalItems(pagination.totalItems);
      } else {
        
        const res = await axiosInstance.get("/users");
        if (Array.isArray(res.data)) {
          setUsers(res.data);
          setTotalPages(Math.ceil(res.data.length / pageSize));
          setTotalItems(res.data.length);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      const errorMessage = err.response?.data?.message || err.message;
      setError(`Failed to load users: ${errorMessage}`);
      
      if (err.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        await fetchUsers();
      } catch (err) {
        setError('Failed to fetch users');
        console.error('Error fetching users:', err);
      }
    };
    verifyAuth();
  }, [navigate]);

 
  useEffect(() => {
    let isMounted = true;
    
    const fetchAndUpdateUsers = async () => {
      try {
        await fetchUsers();
        if (!isMounted) return;
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Failed to load users. Please try again.");
      }
    };
    
    fetchAndUpdateUsers();
    
    return () => {
      isMounted = false;
    };
  }, [currentPage, searchTerm, userType, sortBy, sortOrder]);

  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    setCurrentPage(1); };
  const handleUserTypeChange = (newUserType) => {
    setUserType(newUserType);
    setCurrentPage(1); };
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); };
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEdit = (user) => {
    if (!user || !user.id) {
      setError("Invalid user data");
      return;
    }
    
   
    setEditingUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    setSelectedRole(user.role || "user");
  };

  const handleSave = async () => {
    if (!editingUser || !editingUser.id) {
      setError("Invalid user data");
      return;
    }

    if (!editingUser.name || editingUser.name.trim().length < 3) {
      setError("Name must be at least 3 characters long");
      return;
    }

    if (!editingUser.email || !editingUser.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: editingUser.name.trim(),
        email: editingUser.email.trim(),
        role: selectedRole,
        currentUserEmail: localStorage.getItem('userEmail') 
      };

      await axiosInstance.put(`/users/${editingUser.id}`, payload);
      
      setEditingUser(null);
      setSuccess("User updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
      await fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      const errorMessage = err.response?.data?.message || err.message;
      setError(`Failed to update user: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setSelectedRole("user");
    setError(null);
    setSuccess(null);
  };

  
  const handleDelete = async (userId) => {
    if (!userId) {
      setError("Invalid user ID");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    setDeletingUserId(userId);
    try {
      await axiosInstance.delete(`/users/${userId}`);
      
      setSuccess("User deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
     
      await fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      const errorMessage = err.response?.data?.message || err.message;
      setError(`Failed to delete user: ${errorMessage}`);
    } finally {
      setDeletingUserId(null);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-pink-900">User Management</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        {editingUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center pb-3">
                <h2 className="text-2xl font-bold">Edit User</h2>
                <button
                  onClick={handleCancelEdit}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  X
                </button>
              </div>
              
              {error && (
                <div className="text-red-500 mb-4">
                  {error}
                </div>
              )}
              
              <div className="my-4">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              

              
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-400 text-white rounded mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded`}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
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

        <div className="bg-white rounded-lg shadow-lg p-6">
        
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Sort By</h3>
            <div className="flex gap-4">
              <button
                onClick={() => handleSortChange("asc")}
                className={`px-4 py-2 rounded transition-all ${
                  sortOrder === "asc"
                    ? "bg-pink-900 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Alphabetically A-Z
              </button>
              <button
                onClick={() => handleSortChange("desc")}
                className={`px-4 py-2 rounded transition-all ${
                  sortOrder === "desc"
                    ? "bg-pink-900 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Alphabetically Z-A
              </button>
            </div>
          </div>

         
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Filters</h3>
            <div className="flex flex-col md:flex-row gap-4">
             
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                <select
                  value={userType}
                  onChange={(e) => handleUserTypeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="user">Non-Admins</option>
                </select>
              </div>

             
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {users.length} of {totalItems} users
            {searchTerm && ` for "${searchTerm}"`}
            {userType !== "all" && ` (${userType}s only)`}
          </div>

         
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No users found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 ${
                      user.role === 'admin' ? 'bg-pink-50' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric'
                          }) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(user)}
                          disabled={saving || user.role === 'admin'}
                          className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50"
                          title={user.role === 'admin' ? 'Cannot edit admin users' : ''}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingUserId === user.id || user.role === 'admin'}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title={user.role === 'admin' ? 'Cannot delete admin users' : ''}
                        >
                          {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-4 py-2 rounded ${
                        pageNum === currentPage
                          ? "bg-pink-900 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Edit User</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-pink-900 text-white rounded hover:bg-pink-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersList;