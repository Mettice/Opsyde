// Productivity Integration Templates
// Notion, Airtable, Google Sheets

export const productivityTemplates = {
  notion: [
    {
      id: 'notion-create-page',
      name: 'Notion Create Page',
      description: 'Create new pages in Notion databases',
      category: 'Productivity',
      icon: '📝',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'notion',
        description: 'Notion API for content management',
        protocol: 'rest',
        base_url: 'https://api.notion.com/v1',
        auth_type: 'bearer',
        headers: {
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        primary_endpoints: [
          {
            name: 'create_page',
            path: '/pages',
            method: 'POST',
            description: 'Create a new page in a database',
            parameters: {
              parent: { 
                type: 'object', 
                required: true,
                properties: {
                  database_id: { type: 'string', description: 'Database ID' }
                }
              },
              properties: { type: 'object', required: true, description: 'Page properties' },
              children: { type: 'array', required: false, description: 'Page content blocks' }
            }
          },
          {
            name: 'update_page',
            path: '/pages/{page_id}',
            method: 'PATCH',
            description: 'Update page properties',
            parameters: {
              page_id: { type: 'string', required: true, description: 'Page ID' },
              properties: { type: 'object', required: true, description: 'Updated properties' }
            }
          }
        ]
      },
      defaultParameters: {
        parent: { database_id: 'your-database-id' },
        properties: {
          Name: { title: [{ text: { content: 'New Page from Nodai' } }] }
        }
      },
      authSetup: {
        type: 'integration_token',
        docs_url: 'https://developers.notion.com/docs/authorization'
      }
    },
    {
      id: 'notion-query-database',
      name: 'Notion Query Database',
      description: 'Query and filter Notion database entries',
      category: 'Productivity',
      icon: '🔍',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'notion',
        description: 'Notion database query API',
        protocol: 'rest',
        base_url: 'https://api.notion.com/v1',
        auth_type: 'bearer',
        headers: {
          'Notion-Version': '2022-06-28'
        },
        primary_endpoints: [
          {
            name: 'query_database',
            path: '/databases/{database_id}/query',
            method: 'POST',
            description: 'Query database with filters',
            parameters: {
              database_id: { type: 'string', required: true, description: 'Database ID' },
              filter: { type: 'object', required: false, description: 'Query filters' },
              sorts: { type: 'array', required: false, description: 'Sort criteria' }
            }
          }
        ]
      }
    }
  ],
  
  airtable: [
    {
      id: 'airtable-create-record',
      name: 'Airtable Create Record',
      description: 'Create new records in Airtable bases',
      category: 'Productivity',
      icon: '📊',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'airtable',
        description: 'Airtable API for database operations',
        protocol: 'rest',
        base_url: 'https://api.airtable.com/v0',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_records',
            path: '/{base_id}/{table_name}',
            method: 'POST',
            description: 'Create records in a table',
            parameters: {
              base_id: { type: 'string', required: true, description: 'Airtable base ID' },
              table_name: { type: 'string', required: true, description: 'Table name or ID' },
              records: {
                type: 'array',
                required: true,
                description: 'Array of records to create',
                items: {
                  type: 'object',
                  properties: {
                    fields: { type: 'object', description: 'Record fields' }
                  }
                }
              }
            }
          },
          {
            name: 'list_records',
            path: '/{base_id}/{table_name}',
            method: 'GET',
            description: 'List records from a table',
            parameters: {
              base_id: { type: 'string', required: true },
              table_name: { type: 'string', required: true },
              filterByFormula: { type: 'string', required: false, description: 'Filter formula' }
            }
          }
        ]
      },
      defaultParameters: {
        records: [
          {
            fields: {
              Name: 'New Record from Nodai',
              Status: 'Created'
            }
          }
        ]
      },
      authSetup: {
        type: 'api_key',
        docs_url: 'https://airtable.com/developers/web/api/introduction'
      }
    }
  ],
  
  googleSheets: [
    {
      id: 'sheets-append-row',
      name: 'Google Sheets Add Row',
      description: 'Append rows to Google Sheets',
      category: 'Productivity',
      icon: '📈',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'google_sheets',
        description: 'Google Sheets API for spreadsheet operations',
        protocol: 'rest',
        base_url: 'https://sheets.googleapis.com/v4/spreadsheets',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'append_values',
            path: '/{spreadsheet_id}/values/{range}:append',
            method: 'POST',
            description: 'Append values to a sheet',
            parameters: {
              spreadsheet_id: { type: 'string', required: true, description: 'Spreadsheet ID' },
              range: { type: 'string', required: true, description: 'A1 notation range' },
              valueInputOption: { type: 'string', required: true, default: 'USER_ENTERED' },
              values: {
                type: 'array',
                required: true,
                description: '2D array of values to append',
                items: { type: 'array' }
              }
            }
          },
          {
            name: 'get_values',
            path: '/{spreadsheet_id}/values/{range}',
            method: 'GET',
            description: 'Get values from a range',
            parameters: {
              spreadsheet_id: { type: 'string', required: true },
              range: { type: 'string', required: true, description: 'A1 notation range' }
            }
          },
          {
            name: 'update_values',
            path: '/{spreadsheet_id}/values/{range}',
            method: 'PUT',
            description: 'Update values in a range',
            parameters: {
              spreadsheet_id: { type: 'string', required: true },
              range: { type: 'string', required: true },
              valueInputOption: { type: 'string', required: true, default: 'USER_ENTERED' },
              values: { type: 'array', required: true, description: '2D array of values' }
            }
          }
        ]
      },
      defaultParameters: {
        range: 'Sheet1!A:Z',
        valueInputOption: 'USER_ENTERED',
        values: [['Data from Nodai', new Date().toISOString()]]
      },
      authSetup: {
        type: 'oauth2',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        docs_url: 'https://developers.google.com/sheets/api/guides/authorizing'
      }
    },
    {
      id: 'sheets-create-spreadsheet',
      name: 'Google Sheets Create',
      description: 'Create new Google Spreadsheets',
      category: 'Productivity',
      icon: '📋',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'google_sheets',
        description: 'Google Sheets creation API',
        protocol: 'rest',
        base_url: 'https://sheets.googleapis.com/v4/spreadsheets',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_spreadsheet',
            path: '',
            method: 'POST',
            description: 'Create a new spreadsheet',
            parameters: {
              properties: {
                type: 'object',
                required: true,
                properties: {
                  title: { type: 'string', description: 'Spreadsheet title' }
                }
              },
              sheets: {
                type: 'array',
                required: false,
                description: 'Initial sheets configuration'
              }
            }
          }
        ]
      },
      defaultParameters: {
        properties: {
          title: 'New Spreadsheet from Nodai'
        }
      }
    }
  ]
};

// Export individual categories
export const notionTools = productivityTemplates.notion;
export const airtableTools = productivityTemplates.airtable;
export const googleSheetsTools = productivityTemplates.googleSheets;

// Export all productivity tools as a flat array
export const allProductivityTools = [
  ...productivityTemplates.notion,
  ...productivityTemplates.airtable,
  ...productivityTemplates.googleSheets
];

export default productivityTemplates; 