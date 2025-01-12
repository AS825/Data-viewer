import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import "./App.css";

const App = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFileUpload = (file) => {
    if (!file) return;

    setLoading(true);
    const fileExtension = file.name.split(".").pop();

    const reader = new FileReader();

    if (fileExtension === "json") {
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          processData(jsonData);
          setUploaded(true);
        } catch (error) {
          console.error("Invalid JSON file.", error);
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          processData(jsonData);
          setUploaded(true);
        } catch (error) {
          console.error("Invalid Excel file.", error);
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === "csv") {
      reader.onload = (event) => {
        try {
          Papa.parse(event.target.result, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              processData(results.data);
              setUploaded(true);
            },
          });
        } catch (error) {
          console.error("Invalid CSV file.", error);
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } else {
      console.error(
        "Unsupported file type. Please upload a JSON, Excel, or CSV file."
      );
      setLoading(false);
    }
  };

  const processData = (jsonData) => {
    setData(jsonData);
    setFilteredData(jsonData);
    initializeFilters(jsonData);
    setLoading(false);
  };

  const initializeFilters = (data) => {
    const initialFilters = {};
    if (data.length > 0) {
      Object.keys(data[0]).forEach((key) => {
        initialFilters[key] = "";
      });
    }
    setFilters(initialFilters);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters(
      Object.fromEntries(Object.keys(filters).map((key) => [key, ""]))
    );
    setSearch("");
  };

  useEffect(() => {
    let filtered = data;

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        const filterValue = filters[key].toLowerCase();
        filtered = filtered.filter((item) =>
          item[key]?.toString().toLowerCase().includes(filterValue)
        );
      }
    });

    setFilteredData(
      filtered.filter((item) =>
        Object.values(item).some((value) =>
          value
            ?.toString()
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase())
        )
      )
    );
  }, [filters, debouncedSearch, data]);

  const highlightSearchText = (text) => {
    if (!debouncedSearch) return text;

    const parts = text
      .toString()
      .split(new RegExp(`(${debouncedSearch})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === debouncedSearch.toLowerCase() ? (
        <span
          key={index}
          style={{ backgroundColor: "yellow", fontWeight: "bold" }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const columns = data.length
    ? Object.keys(data[0]).map((key) => ({
        name: key,
        selector: (row) =>
          key === "content" || key === "name" || key === "headline"
            ? highlightSearchText(row[key] || "")
            : row[key],
        sortable: true,
        style:
          key === "content" ? { maxWidth: "300px" } : { maxWidth: "150px" },
      }))
    : [];

  const handleRowClick = (row) => {
    setSelectedRowData(row);
  };

  return (
    <div className="app-container">
      <div className="left-container">
        <h1 className="app-title">Data Viewer</h1>
        {!uploaded && (
        <input
          className="file-input"
          type="file"
          accept=".json, .xlsx, .xls, .csv"
          onChange={(e) => handleFileUpload(e.target.files[0])}
        />
      )}
        {!uploaded && (
          <div
            className={`upload-section ${dragOver ? "drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h2>Upload</h2>
            <p>Drag and drop a file here, or click to upload.</p>
          </div>
        )}

        {uploaded && (
          <>
            <div className="search-section">
              <h2>Search</h2>
              <input
                className="search-input"
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filters-section">
              <h2>Filters</h2>
              <div className="filters-container">
                {Object.keys(filters).map((key) => (
                  <div key={key} className="filter-item">
                    <label htmlFor={key}>{key}</label>
                    <input
                      id={key}
                      type="text"
                      placeholder={`Filter by ${key}`}
                      value={filters[key]}
                      onChange={(e) => handleFilterChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button className="clear-filters-button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          </>
        )}

        <div
          className="table-and-preview"
          style={{ display: "flex", gap: "20px" }}
        >
          <div className="data-table-container" style={{ flex: 2 }}>
            {loading ? (
              <p className="loading-text">Loading data...</p>
            ) : (
              <DataTable
                columns={[...columns]}
                data={filteredData}
                pagination
                highlightOnHover
                responsive
                fixedHeader
                fixedHeaderScrollHeight="1000px"
                onRowClicked={handleRowClick}
                conditionalRowStyles={[
                  {
                    when: (row) => row === selectedRowData,
                    style: {
                      backgroundColor: "rgba(0, 123, 255, 0.2)",
                    },
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>
      <div className="right-container">
        {selectedRowData && filteredData.length > 0 && (
          <div className="content-preview">
            <h3>Content Preview</h3>
            <table className="preview-table">
              <tbody>
                {Object.entries(selectedRowData).map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{highlightSearchText(value?.toString() || "N/A")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
