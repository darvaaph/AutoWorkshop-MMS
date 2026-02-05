import React from 'react';

const Table = ({ columns, data }) => {
    return (
        <table className="min-w-full border-collapse border border-gray-200">
            <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column.accessor} className="border border-gray-200 p-2 text-left">
                            {column.Header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-100">
                        {columns.map((column) => (
                            <td key={column.accessor} className="border border-gray-200 p-2">
                                {row[column.accessor]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default Table;