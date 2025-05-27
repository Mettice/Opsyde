// components/rich-content/renderers/TableRenderer.jsx
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

const TableRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Items per page based on display mode
  const itemsPerPage = displayMode === 'minimal' ? 5 : 10;

  // Process table data
  const tableData = useMemo(() => {
    if (!content) return { columns: [], rows: [] };
    
    // Handle different table data formats
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return { columns: [], rows: [] };
      }
      
      // Array of objects - extract columns from first object
      if (typeof content[0] === 'object' && content[0] !== null) {
        const columns = Object.keys(content[0]);
        return { columns, rows: content };
      }
      
      // Array of arrays - first row as headers
      if (Array.isArray(content[0])) {
        const [headerRow, ...dataRows] = content;
        return { columns: headerRow, rows: dataRows.map(row => {
          const obj = {};
          headerRow.forEach((col, index) => {
            obj[col] = row[index];
          });
          return obj;
        })};
      }
    }
    
    // Object with explicit structure
    if (content.headers && content.rows) {
      return { columns: content.headers, rows: content.rows };
    }
    
    if (content.columns && content.data) {
      return { columns: content.columns, rows: content.data };
    }
    
    // Single object - convert to single row
    if (typeof content === 'object' && content !== null) {
      const columns = Object.keys(content);
      return { columns, rows: [content] };
    }
    
    return { columns: [], rows: [] };
  }, [content]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData.rows;
    
    return tableData.rows.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tableData.rows, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      // Handle different data types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Handlers
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Don't render if no data
  if (tableData.columns.length === 0) {
    return (
      <div className="table-container p-4 text-center text-gray-500">
        <div className="text-4xl mb-2">📋</div>
        <div>No table data available</div>
      </div>
    );
  }

  return (
    <div className="table-container space-y-4">
      {/* Header */}
      {metadata?.title && (
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">📊</span>
          {metadata.title}
        </h3>
      )}
      
      {/* Controls - only show in full modes */}
      {displayMode !== 'minimal' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {paginatedData.length} of {sortedData.length} rows
              {searchTerm && ` (filtered from ${tableData.rows.length})`}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search table..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-2.5 top-2.5 text-gray-400">
                🔍
              </div>
            </div>
            
            {/* Export button */}
            <button
              onClick={() => {
                const csv = [
                  tableData.columns.join(','),
                  ...sortedData.map(row => 
                    tableData.columns.map(col => `"${String(row[col] || '')}"`).join(',')
                  )
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `table-data-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
            >
              <span className="mr-1">💾</span>
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {tableData.columns.map(column => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{column}</span>
                      <div className="ml-2 flex-shrink-0">
                        {sortColumn === column ? (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {tableData.columns.map(column => {
                    const value = row[column];
                    const displayValue = value === null || value === undefined ? '—' : String(value);
                    
                    return (
                      <td key={column} className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={displayValue}>
                          {displayValue}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - only show if needed and not in minimal mode */}
      {totalPages > 1 && displayMode !== 'minimal' && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Minimal mode summary */}
      {displayMode === 'minimal' && totalPages > 1 && (
        <div className="text-center">
          <button className="text-blue-600 text-sm hover:text-blue-700 transition-colors">
            Show all {sortedData.length} rows...
          </button>
        </div>
      )}
    </div>
  );
};

TableRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default TableRenderer;