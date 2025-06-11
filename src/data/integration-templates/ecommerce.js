// E-commerce Integration Templates
// Shopify, Stripe

export const ecommerceTemplates = {
  shopify: [
    {
      id: 'shopify-create-product',
      name: 'Shopify Create Product',
      description: 'Create new products in Shopify store',
      category: 'E-commerce',
      icon: '🛍️',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'shopify',
        description: 'Shopify Admin API for product management',
        protocol: 'rest',
        base_url: 'https://{shop}.myshopify.com/admin/api/2023-10',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_product',
            path: '/products.json',
            method: 'POST',
            description: 'Create a new product',
            parameters: {
              product: {
                type: 'object',
                required: true,
                properties: {
                  title: { type: 'string', description: 'Product title' },
                  body_html: { type: 'string', description: 'Product description HTML' },
                  vendor: { type: 'string', description: 'Product vendor' },
                  product_type: { type: 'string', description: 'Product type' },
                  status: { 
                    type: 'string', 
                    enum: ['active', 'archived', 'draft'],
                    default: 'active',
                    description: 'Product status'
                  },
                  tags: { type: 'string', description: 'Comma-separated tags' },
                  variants: {
                    type: 'array',
                    description: 'Product variants',
                    items: {
                      type: 'object',
                      properties: {
                        price: { type: 'string', description: 'Variant price' },
                        sku: { type: 'string', description: 'SKU' },
                        inventory_quantity: { type: 'integer', description: 'Inventory quantity' },
                        weight: { type: 'number', description: 'Weight' },
                        weight_unit: { type: 'string', description: 'Weight unit' }
                      }
                    }
                  },
                  images: {
                    type: 'array',
                    description: 'Product images',
                    items: {
                      type: 'object',
                      properties: {
                        src: { type: 'string', description: 'Image URL' },
                        alt: { type: 'string', description: 'Alt text' }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            name: 'update_product',
            path: '/products/{product_id}.json',
            method: 'PUT',
            description: 'Update existing product',
            parameters: {
              product_id: { type: 'string', required: true, description: 'Product ID' },
              product: { type: 'object', required: true, description: 'Product data to update' }
            }
          },
          {
            name: 'get_products',
            path: '/products.json',
            method: 'GET',
            description: 'Get products list',
            parameters: {
              limit: { type: 'integer', required: false, default: 50, description: 'Number of products' },
              status: { type: 'string', required: false, description: 'Product status filter' },
              vendor: { type: 'string', required: false, description: 'Vendor filter' }
            }
          }
        ]
      },
      defaultParameters: {
        product: {
          title: 'New Product from Nodai',
          body_html: '<p>Product created automatically by Nodai workflow.</p>',
          vendor: 'Nodai Store',
          product_type: 'General',
          status: 'active',
          variants: [
            {
              price: '29.99',
              inventory_quantity: 100
            }
          ]
        }
      },
      authSetup: {
        type: 'access_token',
        scopes: ['write_products', 'read_products'],
        docs_url: 'https://shopify.dev/docs/api/admin-rest/2023-10/resources/product'
      }
    },
    {
      id: 'shopify-create-order',
      name: 'Shopify Create Order',
      description: 'Create new orders in Shopify store',
      category: 'E-commerce',
      icon: '📦',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'shopify',
        description: 'Shopify order management',
        protocol: 'rest',
        base_url: 'https://{shop}.myshopify.com/admin/api/2023-10',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_order',
            path: '/orders.json',
            method: 'POST',
            description: 'Create a new order',
            parameters: {
              order: {
                type: 'object',
                required: true,
                properties: {
                  line_items: {
                    type: 'array',
                    description: 'Order line items',
                    items: {
                      type: 'object',
                      properties: {
                        variant_id: { type: 'string', description: 'Product variant ID' },
                        quantity: { type: 'integer', description: 'Quantity' },
                        price: { type: 'string', description: 'Price per item' }
                      }
                    }
                  },
                  customer: {
                    type: 'object',
                    description: 'Customer information',
                    properties: {
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string' }
                    }
                  },
                  billing_address: { type: 'object', description: 'Billing address' },
                  shipping_address: { type: 'object', description: 'Shipping address' },
                  financial_status: { 
                    type: 'string', 
                    enum: ['pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided'],
                    description: 'Financial status'
                  }
                }
              }
            }
          }
        ]
      }
    },
    {
      id: 'shopify-update-inventory',
      name: 'Shopify Update Inventory',
      description: 'Update inventory levels for products',
      category: 'E-commerce',
      icon: '📊',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'shopify',
        description: 'Shopify inventory management',
        protocol: 'rest',
        base_url: 'https://{shop}.myshopify.com/admin/api/2023-10',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'update_inventory_level',
            path: '/inventory_levels/set.json',
            method: 'POST',
            description: 'Set inventory level for a location',
            parameters: {
              location_id: { type: 'string', required: true, description: 'Location ID' },
              inventory_item_id: { type: 'string', required: true, description: 'Inventory item ID' },
              available: { type: 'integer', required: true, description: 'Available quantity' }
            }
          }
        ]
      }
    }
  ],
  
  stripe: [
    {
      id: 'stripe-create-customer',
      name: 'Stripe Create Customer',
      description: 'Create new customers in Stripe',
      category: 'E-commerce',
      icon: '👤',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'stripe',
        description: 'Stripe API for customer management',
        protocol: 'rest',
        base_url: 'https://api.stripe.com/v1',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_customer',
            path: '/customers',
            method: 'POST',
            description: 'Create a new customer',
            parameters: {
              email: { type: 'string', required: false, description: 'Customer email' },
              name: { type: 'string', required: false, description: 'Customer name' },
              phone: { type: 'string', required: false, description: 'Customer phone' },
              description: { type: 'string', required: false, description: 'Customer description' },
              metadata: { type: 'object', required: false, description: 'Customer metadata' },
              address: {
                type: 'object',
                required: false,
                properties: {
                  line1: { type: 'string' },
                  line2: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  postal_code: { type: 'string' },
                  country: { type: 'string' }
                }
              }
            }
          },
          {
            name: 'update_customer',
            path: '/customers/{customer_id}',
            method: 'POST',
            description: 'Update existing customer',
            parameters: {
              customer_id: { type: 'string', required: true, description: 'Customer ID' }
            }
          }
        ]
      },
      defaultParameters: {
        name: 'New Customer from Nodai',
        description: 'Customer created by Nodai workflow'
      },
      authSetup: {
        type: 'secret_key',
        docs_url: 'https://stripe.com/docs/api/customers'
      }
    },
    {
      id: 'stripe-create-payment-intent',
      name: 'Stripe Create Payment',
      description: 'Create payment intents in Stripe',
      category: 'E-commerce',
      icon: '💳',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'stripe',
        description: 'Stripe payment processing',
        protocol: 'rest',
        base_url: 'https://api.stripe.com/v1',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_payment_intent',
            path: '/payment_intents',
            method: 'POST',
            description: 'Create a payment intent',
            parameters: {
              amount: { type: 'integer', required: true, description: 'Amount in cents' },
              currency: { type: 'string', required: true, default: 'usd', description: 'Currency code' },
              customer: { type: 'string', required: false, description: 'Customer ID' },
              description: { type: 'string', required: false, description: 'Payment description' },
              metadata: { type: 'object', required: false, description: 'Payment metadata' },
              payment_method_types: {
                type: 'array',
                required: false,
                default: ['card'],
                description: 'Allowed payment methods'
              },
              confirm: { type: 'boolean', required: false, description: 'Auto-confirm payment' }
            }
          },
          {
            name: 'confirm_payment_intent',
            path: '/payment_intents/{payment_intent_id}/confirm',
            method: 'POST',
            description: 'Confirm a payment intent',
            parameters: {
              payment_intent_id: { type: 'string', required: true, description: 'Payment Intent ID' },
              payment_method: { type: 'string', required: false, description: 'Payment method ID' }
            }
          }
        ]
      },
      defaultParameters: {
        amount: 2999, // $29.99
        currency: 'usd',
        description: 'Payment from Nodai workflow'
      }
    },
    {
      id: 'stripe-create-subscription',
      name: 'Stripe Create Subscription',
      description: 'Create recurring subscriptions',
      category: 'E-commerce',
      icon: '🔄',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'stripe',
        description: 'Stripe subscription management',
        protocol: 'rest',
        base_url: 'https://api.stripe.com/v1',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_subscription',
            path: '/subscriptions',
            method: 'POST',
            description: 'Create a new subscription',
            parameters: {
              customer: { type: 'string', required: true, description: 'Customer ID' },
              items: {
                type: 'array',
                required: true,
                description: 'Subscription items',
                items: {
                  type: 'object',
                  properties: {
                    price: { type: 'string', description: 'Price ID' },
                    quantity: { type: 'integer', description: 'Quantity' }
                  }
                }
              },
              trial_period_days: { type: 'integer', required: false, description: 'Trial period in days' },
              metadata: { type: 'object', required: false, description: 'Subscription metadata' }
            }
          },
          {
            name: 'cancel_subscription',
            path: '/subscriptions/{subscription_id}',
            method: 'DELETE',
            description: 'Cancel a subscription',
            parameters: {
              subscription_id: { type: 'string', required: true, description: 'Subscription ID' }
            }
          }
        ]
      }
    },
    {
      id: 'stripe-create-product',
      name: 'Stripe Create Product',
      description: 'Create products and prices in Stripe',
      category: 'E-commerce',
      icon: '🏷️',
      type: 'universal_api',
      framework: 'universal_api',
      frameworkConfig: {
        service_name: 'stripe',
        description: 'Stripe product catalog',
        protocol: 'rest',
        base_url: 'https://api.stripe.com/v1',
        auth_type: 'bearer',
        primary_endpoints: [
          {
            name: 'create_product',
            path: '/products',
            method: 'POST',
            description: 'Create a new product',
            parameters: {
              name: { type: 'string', required: true, description: 'Product name' },
              description: { type: 'string', required: false, description: 'Product description' },
              type: { 
                type: 'string', 
                required: false, 
                enum: ['service', 'good'], 
                default: 'service',
                description: 'Product type'
              },
              metadata: { type: 'object', required: false, description: 'Product metadata' },
              images: { type: 'array', required: false, description: 'Product image URLs' }
            }
          },
          {
            name: 'create_price',
            path: '/prices',
            method: 'POST',
            description: 'Create a price for a product',
            parameters: {
              product: { type: 'string', required: true, description: 'Product ID' },
              unit_amount: { type: 'integer', required: true, description: 'Price in cents' },
              currency: { type: 'string', required: true, default: 'usd', description: 'Currency' },
              recurring: {
                type: 'object',
                required: false,
                properties: {
                  interval: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
                  interval_count: { type: 'integer' }
                }
              }
            }
          }
        ]
      },
      defaultParameters: {
        name: 'New Product from Nodai',
        type: 'service'
      }
    }
  ]
};

// Export individual categories
export const shopifyTools = ecommerceTemplates.shopify;
export const stripeTools = ecommerceTemplates.stripe;

// Export all e-commerce tools as a flat array
export const allEcommerceTools = [
  ...ecommerceTemplates.shopify,
  ...ecommerceTemplates.stripe
];

export default ecommerceTemplates; 