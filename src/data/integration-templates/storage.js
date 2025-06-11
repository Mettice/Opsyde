// Storage Integration Templates
// Google Drive, Dropbox

export const storageTemplates = {
  googleDrive: [
    {
      id: 'drive-upload-file',
      name: 'Google Drive Upload File',
      description: 'Upload files to Google Drive',
      category: 'Storage',
      icon: '📁',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'google_drive',
        description: 'Google Drive API for file management',
        protocol: 'rest',
        base_url: 'https://www.googleapis.com/drive/v3',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'upload_file',
            path: '/files',
            method: 'POST',
            description: 'Upload a file to Google Drive',
            parameters: {
              name: { type: 'string', required: true, description: 'File name' },
              parents: { type: 'array', required: false, description: 'Parent folder IDs' },
              mimeType: { type: 'string', required: false, description: 'MIME type' },
              description: { type: 'string', required: false, description: 'File description' },
              starred: { type: 'boolean', required: false, description: 'Star the file' }
            }
          },
          {
            name: 'update_file',
            path: '/files/{file_id}',
            method: 'PATCH',
            description: 'Update file metadata',
            parameters: {
              file_id: { type: 'string', required: true, description: 'File ID' },
              name: { type: 'string', required: false, description: 'New file name' },
              description: { type: 'string', required: false, description: 'New description' }
            }
          }
        ]
      },
      defaultParameters: {
        name: 'file-from-nodai.txt',
        description: 'File uploaded by Nodai workflow'
      },
      authSetup: {
        type: 'oauth2',
        scopes: ['https://www.googleapis.com/auth/drive.file'],
        docs_url: 'https://developers.google.com/drive/api/guides/manage-uploads'
      }
    },
    {
      id: 'drive-create-folder',
      name: 'Google Drive Create Folder',
      description: 'Create folders in Google Drive',
      category: 'Storage',
      icon: '📂',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'google_drive',
        description: 'Google Drive folder management',
        protocol: 'rest',
        base_url: 'https://www.googleapis.com/drive/v3',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_folder',
            path: '/files',
            method: 'POST',
            description: 'Create a new folder',
            parameters: {
              name: { type: 'string', required: true, description: 'Folder name' },
              mimeType: { 
                type: 'string', 
                required: true, 
                default: 'application/vnd.google-apps.folder',
                description: 'MIME type for folder'
              },
              parents: { type: 'array', required: false, description: 'Parent folder IDs' },
              description: { type: 'string', required: false, description: 'Folder description' }
            }
          }
        ]
      },
      defaultParameters: {
        name: 'Nodai Workflow Files',
        mimeType: 'application/vnd.google-apps.folder'
      }
    },
    {
      id: 'drive-list-files',
      name: 'Google Drive List Files',
      description: 'List and search files in Google Drive',
      category: 'Storage',
      icon: '🔍',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'google_drive',
        description: 'Google Drive file search',
        protocol: 'rest',
        base_url: 'https://www.googleapis.com/drive/v3',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'list_files',
            path: '/files',
            method: 'GET',
            description: 'List files in Google Drive',
            parameters: {
              q: { type: 'string', required: false, description: 'Search query' },
              pageSize: { type: 'integer', required: false, default: 10, description: 'Number of files to return' },
              fields: { type: 'string', required: false, description: 'Fields to include in response' },
              orderBy: { type: 'string', required: false, description: 'Sort order (name, createdTime, modifiedTime)' }
            }
          },
          {
            name: 'get_file',
            path: '/files/{file_id}',
            method: 'GET',
            description: 'Get file metadata',
            parameters: {
              file_id: { type: 'string', required: true, description: 'File ID' },
              fields: { type: 'string', required: false, description: 'Fields to include' }
            }
          }
        ]
      }
    },
    {
      id: 'drive-share-file',
      name: 'Google Drive Share File',
      description: 'Share files and set permissions',
      category: 'Storage',
      icon: '🔗',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'google_drive',
        description: 'Google Drive sharing and permissions',
        protocol: 'rest',
        base_url: 'https://www.googleapis.com/drive/v3',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_permission',
            path: '/files/{file_id}/permissions',
            method: 'POST',
            description: 'Create a permission for a file',
            parameters: {
              file_id: { type: 'string', required: true, description: 'File ID' },
              role: { 
                type: 'string', 
                required: true,
                enum: ['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader'],
                description: 'Permission role'
              },
              type: { 
                type: 'string', 
                required: true,
                enum: ['user', 'group', 'domain', 'anyone'],
                description: 'Permission type'
              },
              emailAddress: { type: 'string', required: false, description: 'Email address (for user/group)' },
              domain: { type: 'string', required: false, description: 'Domain (for domain type)' }
            }
          }
        ]
      }
    }
  ],
  
  dropbox: [
    {
      id: 'dropbox-upload-file',
      name: 'Dropbox Upload File',
      description: 'Upload files to Dropbox',
      category: 'Storage',
      icon: '📤',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'dropbox',
        description: 'Dropbox API for file management',
        protocol: 'rest',
        base_url: 'https://content.dropboxapi.com/2',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'upload_file',
            path: '/files/upload',
            method: 'POST',
            description: 'Upload a file to Dropbox',
            headers: {
              'Dropbox-API-Arg': 'json_string',
              'Content-Type': 'application/octet-stream'
            },
            parameters: {
              path: { type: 'string', required: true, description: 'Destination path' },
              mode: { 
                type: 'string', 
                required: false,
                enum: ['add', 'overwrite', 'update'],
                default: 'add',
                description: 'Write mode'
              },
              autorename: { type: 'boolean', required: false, description: 'Auto-rename if conflict' },
              client_modified: { type: 'string', required: false, description: 'Client modification time' },
              mute: { type: 'boolean', required: false, description: 'Mute notifications' }
            }
          }
        ]
      },
      defaultParameters: {
        path: '/nodai-uploads/file-from-nodai.txt',
        mode: 'add',
        autorename: true
      },
      authSetup: {
        type: 'access_token',
        scopes: ['files.content.write'],
        docs_url: 'https://www.dropbox.com/developers/documentation/http/documentation#files-upload'
      }
    },
    {
      id: 'dropbox-create-folder',
      name: 'Dropbox Create Folder',
      description: 'Create folders in Dropbox',
      category: 'Storage',
      icon: '📁',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'dropbox',
        description: 'Dropbox folder management',
        protocol: 'rest',
        base_url: 'https://api.dropboxapi.com/2',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_folder',
            path: '/files/create_folder_v2',
            method: 'POST',
            description: 'Create a new folder',
            parameters: {
              path: { type: 'string', required: true, description: 'Folder path' },
              autorename: { type: 'boolean', required: false, description: 'Auto-rename if exists' }
            }
          }
        ]
      },
      defaultParameters: {
        path: '/Nodai Workflow Files',
        autorename: true
      }
    },
    {
      id: 'dropbox-list-files',
      name: 'Dropbox List Files',
      description: 'List files and folders in Dropbox',
      category: 'Storage',
      icon: '📋',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'dropbox',
        description: 'Dropbox file listing',
        protocol: 'rest',
        base_url: 'https://api.dropboxapi.com/2',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'list_folder',
            path: '/files/list_folder',
            method: 'POST',
            description: 'List contents of a folder',
            parameters: {
              path: { type: 'string', required: true, description: 'Folder path' },
              recursive: { type: 'boolean', required: false, description: 'List recursively' },
              include_media_info: { type: 'boolean', required: false, description: 'Include media info' },
              include_deleted: { type: 'boolean', required: false, description: 'Include deleted files' },
              include_has_explicit_shared_members: { type: 'boolean', required: false, description: 'Include sharing info' },
              include_mounted_folders: { type: 'boolean', required: false, description: 'Include mounted folders' },
              limit: { type: 'integer', required: false, description: 'Max entries to return' }
            }
          },
          {
            name: 'search_files',
            path: '/files/search_v2',
            method: 'POST',
            description: 'Search for files and folders',
            parameters: {
              query: { type: 'string', required: true, description: 'Search query' },
              options: {
                type: 'object',
                required: false,
                properties: {
                  path: { type: 'string', description: 'Path to search in' },
                  max_results: { type: 'integer', description: 'Max results' },
                  file_status: { type: 'string', description: 'File status filter' }
                }
              }
            }
          }
        ]
      },
      defaultParameters: {
        path: '',
        recursive: false
      }
    },
    {
      id: 'dropbox-share-file',
      name: 'Dropbox Share File',
      description: 'Create share links for files',
      category: 'Storage',
      icon: '🔗',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'dropbox',
        description: 'Dropbox sharing',
        protocol: 'rest',
        base_url: 'https://api.dropboxapi.com/2',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_shared_link',
            path: '/sharing/create_shared_link_with_settings',
            method: 'POST',
            description: 'Create a shared link for a file',
            parameters: {
              path: { type: 'string', required: true, description: 'File path' },
              settings: {
                type: 'object',
                required: false,
                properties: {
                  requested_visibility: { 
                    type: 'string',
                    enum: ['public', 'team_only', 'password'],
                    description: 'Link visibility'
                  },
                  link_password: { type: 'string', description: 'Password for link' },
                  expires: { type: 'string', description: 'Expiration date' }
                }
              }
            }
          },
          {
            name: 'list_shared_links',
            path: '/sharing/list_shared_links',
            method: 'POST',
            description: 'List shared links',
            parameters: {
              path: { type: 'string', required: false, description: 'Path to filter by' },
              cursor: { type: 'string', required: false, description: 'Pagination cursor' },
              direct_only: { type: 'boolean', required: false, description: 'Direct links only' }
            }
          }
        ]
      }
    },
    {
      id: 'dropbox-get-metadata',
      name: 'Dropbox Get Metadata',
      description: 'Get file and folder metadata',
      category: 'Storage',
      icon: 'ℹ️',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'dropbox',
        description: 'Dropbox metadata',
        protocol: 'rest',
        base_url: 'https://api.dropboxapi.com/2',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'get_metadata',
            path: '/files/get_metadata',
            method: 'POST',
            description: 'Get metadata for a file or folder',
            parameters: {
              path: { type: 'string', required: true, description: 'File or folder path' },
              include_media_info: { type: 'boolean', required: false, description: 'Include media info' },
              include_deleted: { type: 'boolean', required: false, description: 'Include if deleted' },
              include_has_explicit_shared_members: { type: 'boolean', required: false, description: 'Include sharing info' }
            }
          }
        ]
      }
    }
  ]
};

// Export individual categories
export const googleDriveTools = storageTemplates.googleDrive;
export const dropboxTools = storageTemplates.dropbox;

// Export all storage tools as a flat array
export const allStorageTools = [
  ...storageTemplates.googleDrive,
  ...storageTemplates.dropbox
];

export default storageTemplates; 