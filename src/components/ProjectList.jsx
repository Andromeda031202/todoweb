import React from 'react';

function ProjectList({ projects, onEdit, onDelete }) {
  const handleDelete = async (projectId) => {
    try {
      if (!projectId) {
        console.error('Invalid project ID for deletion');
        return;
      }
      
      if (typeof onDelete !== 'function') {
        console.error('onDelete prop is not a function');
        return;
      }

      if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        await onDelete(projectId);
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  const handleEdit = (project) => {
    try {
      if (!project || (!project._id && !project.id)) {
        console.error('Invalid project data for editing');
        return;
      }

      if (typeof onEdit !== 'function') {
        console.error('onEdit prop is not a function');
        return;
      }

      // Normalize project data before passing to edit
      const normalizedProject = {
        ...project,
        _id: project._id || project.id,
        name: project.name || project.title || 'Untitled Project',
        description: project.description || '',
        status: project.status || 'Not Started',
        deadline: project.deadline || '',
        assignedUsers: project.assignedUsers || []
      };

      onEdit(normalizedProject);
    } catch (error) {
      console.error('Error in handleEdit:', error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Project Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Description</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Created On</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">End Date</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Status</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Assigned Users</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.length === 0 ? (
            <tr>
              <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                No projects found
              </td>
            </tr>
          ) : (
            projects.map((project) => {
              if (!project || (!project._id && !project.id)) return null;
              
              const projectId = project._id || project.id;
              
              return (
                <tr key={projectId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {project?.name || project?.title || 'Untitled Project'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {project?.createdAt ? new Date(project.createdAt).toLocaleDateString('en-GB') : '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {project?.deadline ? new Date(project.deadline).toLocaleDateString('en-GB') : '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${project?.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project?.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}`}>
                      {project?.status || 'Not Started'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {project?.assignedUsers?.length > 0 
                        ? project.assignedUsers.map(user => user.name || 'Unknown User').join(', ') 
                        : 'No users assigned'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500 max-w-sm truncate" title={project?.description || 'No description'}>
                      {project?.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() => handleEdit(project)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(projectId)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {projects.length === 0 && (
        <div className="col-span-full text-center py-8">
          <p className="text-white text-xl">No projects found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}

export default ProjectList; 