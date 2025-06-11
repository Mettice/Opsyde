// CRM Integration Templates
// HubSpot, Salesforce

export const crmTemplates = {
  hubspot: [
    {
      id: 'hubspot-create-contact',
      name: 'HubSpot Create Contact',
      description: 'Create new contacts in HubSpot CRM',
      category: 'CRM',
      icon: '👤',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'hubspot',
        description: 'HubSpot CRM API for contact management',
        protocol: 'rest',
        base_url: 'https://api.hubapi.com',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_contact',
            path: '/crm/v3/objects/contacts',
            method: 'POST',
            description: 'Create a new contact',
            parameters: {
              properties: {
                type: 'object',
                required: true,
                properties: {
                  email: { type: 'string', description: 'Contact email' },
                  firstname: { type: 'string', description: 'First name' },
                  lastname: { type: 'string', description: 'Last name' },
                  phone: { type: 'string', description: 'Phone number' },
                  company: { type: 'string', description: 'Company name' },
                  website: { type: 'string', description: 'Website URL' },
                  lifecyclestage: { 
                    type: 'string', 
                    description: 'Lifecycle stage',
                    enum: ['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist', 'other']
                  }
                }
              }
            }
          },
          {
            name: 'update_contact',
            path: '/crm/v3/objects/contacts/{contact_id}',
            method: 'PATCH',
            description: 'Update existing contact',
            parameters: {
              contact_id: { type: 'string', required: true, description: 'Contact ID' },
              properties: { type: 'object', required: true, description: 'Properties to update' }
            }
          },
          {
            name: 'search_contacts',
            path: '/crm/v3/objects/contacts/search',
            method: 'POST',
            description: 'Search for contacts',
            parameters: {
              filterGroups: { type: 'array', required: true, description: 'Search filters' },
              sorts: { type: 'array', required: false, description: 'Sort criteria' },
              properties: { type: 'array', required: false, description: 'Properties to return' },
              limit: { type: 'integer', required: false, default: 10, description: 'Number of results' }
            }
          }
        ]
      },
      defaultParameters: {
        properties: {
          email: 'newcontact@example.com',
          firstname: 'New',
          lastname: 'Contact',
          lifecyclestage: 'lead'
        }
      },
      authSetup: {
        type: 'private_app_token',
        scopes: ['crm.objects.contacts.write', 'crm.objects.contacts.read'],
        docs_url: 'https://developers.hubspot.com/docs/api/crm/contacts'
      }
    },
    {
      id: 'hubspot-create-deal',
      name: 'HubSpot Create Deal',
      description: 'Create new deals in HubSpot CRM',
      category: 'CRM',
      icon: '💰',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'hubspot',
        description: 'HubSpot deals management',
        protocol: 'rest',
        base_url: 'https://api.hubapi.com',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_deal',
            path: '/crm/v3/objects/deals',
            method: 'POST',
            description: 'Create a new deal',
            parameters: {
              properties: {
                type: 'object',
                required: true,
                properties: {
                  dealname: { type: 'string', description: 'Deal name' },
                  amount: { type: 'string', description: 'Deal amount' },
                  dealstage: { type: 'string', description: 'Deal stage' },
                  pipeline: { type: 'string', description: 'Pipeline ID' },
                  closedate: { type: 'string', description: 'Expected close date (YYYY-MM-DD)' },
                  hubspot_owner_id: { type: 'string', description: 'Deal owner ID' }
                }
              },
              associations: { type: 'array', required: false, description: 'Associated contacts/companies' }
            }
          }
        ]
      },
      defaultParameters: {
        properties: {
          dealname: 'New Deal from Nodai',
          amount: '1000',
          dealstage: 'appointmentscheduled'
        }
      }
    },
    {
      id: 'hubspot-create-company',
      name: 'HubSpot Create Company',
      description: 'Create new companies in HubSpot CRM',
      category: 'CRM',
      icon: '🏢',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'hubspot',
        description: 'HubSpot company management',
        protocol: 'rest',
        base_url: 'https://api.hubapi.com',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_company',
            path: '/crm/v3/objects/companies',
            method: 'POST',
            description: 'Create a new company',
            parameters: {
              properties: {
                type: 'object',
                required: true,
                properties: {
                  name: { type: 'string', description: 'Company name' },
                  domain: { type: 'string', description: 'Company domain' },
                  industry: { type: 'string', description: 'Industry' },
                  phone: { type: 'string', description: 'Phone number' },
                  city: { type: 'string', description: 'City' },
                  state: { type: 'string', description: 'State' },
                  country: { type: 'string', description: 'Country' }
                }
              }
            }
          }
        ]
      },
      defaultParameters: {
        properties: {
          name: 'New Company from Nodai'
        }
      }
    }
  ],
  
  salesforce: [
    {
      id: 'salesforce-create-lead',
      name: 'Salesforce Create Lead',
      description: 'Create new leads in Salesforce CRM',
      category: 'CRM',
      icon: '⚡',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'salesforce',
        description: 'Salesforce CRM API for lead management',
        protocol: 'rest',
        base_url: 'https://{instance}.salesforce.com/services/data/v57.0',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_lead',
            path: '/sobjects/Lead',
            method: 'POST',
            description: 'Create a new lead',
            parameters: {
              LastName: { type: 'string', required: true, description: 'Last name' },
              Company: { type: 'string', required: true, description: 'Company name' },
              FirstName: { type: 'string', required: false, description: 'First name' },
              Email: { type: 'string', required: false, description: 'Email address' },
              Phone: { type: 'string', required: false, description: 'Phone number' },
              Status: { type: 'string', required: false, description: 'Lead status' },
              LeadSource: { type: 'string', required: false, description: 'Lead source' },
              Industry: { type: 'string', required: false, description: 'Industry' }
            }
          },
          {
            name: 'update_lead',
            path: '/sobjects/Lead/{lead_id}',
            method: 'PATCH',
            description: 'Update existing lead',
            parameters: {
              lead_id: { type: 'string', required: true, description: 'Lead ID' }
            }
          }
        ]
      },
      defaultParameters: {
        LastName: 'New Lead',
        Company: 'Unknown Company',
        Status: 'Open - Not Contacted',
        LeadSource: 'Nodai Workflow'
      },
      authSetup: {
        type: 'oauth2',
        scopes: ['api', 'refresh_token'],
        docs_url: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/'
      }
    },
    {
      id: 'salesforce-create-contact',
      name: 'Salesforce Create Contact',
      description: 'Create new contacts in Salesforce CRM',
      category: 'CRM',
      icon: '👥',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'salesforce',
        description: 'Salesforce contact management',
        protocol: 'rest',
        base_url: 'https://{instance}.salesforce.com/services/data/v57.0',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_contact',
            path: '/sobjects/Contact',
            method: 'POST',
            description: 'Create a new contact',
            parameters: {
              LastName: { type: 'string', required: true, description: 'Last name' },
              FirstName: { type: 'string', required: false, description: 'First name' },
              Email: { type: 'string', required: false, description: 'Email address' },
              Phone: { type: 'string', required: false, description: 'Phone number' },
              AccountId: { type: 'string', required: false, description: 'Account ID' },
              Title: { type: 'string', required: false, description: 'Job title' },
              Department: { type: 'string', required: false, description: 'Department' }
            }
          }
        ]
      },
      defaultParameters: {
        LastName: 'New Contact'
      }
    },
    {
      id: 'salesforce-create-opportunity',
      name: 'Salesforce Create Opportunity',
      description: 'Create new opportunities in Salesforce CRM',
      category: 'CRM',
      icon: '🎯',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'salesforce',
        description: 'Salesforce opportunity management',
        protocol: 'rest',
        base_url: 'https://{instance}.salesforce.com/services/data/v57.0',
        auth_type: 'oauth2',
        primary_endpoints: [
          {
            name: 'create_opportunity',
            path: '/sobjects/Opportunity',
            method: 'POST',
            description: 'Create a new opportunity',
            parameters: {
              Name: { type: 'string', required: true, description: 'Opportunity name' },
              StageName: { type: 'string', required: true, description: 'Sales stage' },
              CloseDate: { type: 'string', required: true, description: 'Close date (YYYY-MM-DD)' },
              Amount: { type: 'number', required: false, description: 'Opportunity amount' },
              AccountId: { type: 'string', required: false, description: 'Account ID' },
              LeadSource: { type: 'string', required: false, description: 'Lead source' },
              Probability: { type: 'number', required: false, description: 'Probability percentage' }
            }
          }
        ]
      },
      defaultParameters: {
        Name: 'New Opportunity from Nodai',
        StageName: 'Prospecting',
        CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      }
    }
  ]
};

// Export individual categories
export const hubspotTools = crmTemplates.hubspot;
export const salesforceTools = crmTemplates.salesforce;

// Export all CRM tools as a flat array
export const allCrmTools = [
  ...crmTemplates.hubspot,
  ...crmTemplates.salesforce
];

export default crmTemplates; 