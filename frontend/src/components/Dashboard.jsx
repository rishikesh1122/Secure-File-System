import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) navigate('/');
    else fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/files', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFiles(data);
    } catch {
      alert('Error fetching files');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (file) => {
    try {
      const res = await fetch(`http://localhost:5000/api/files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (file.mimeType?.startsWith('image/')) {
        setPreview(<img src={url} alt="Preview" className="max-w-full max-h-96 mx-auto" />);
      } else if (file.mimeType?.startsWith('text/')) {
        const text = await blob.text();
        setPreview(<pre className="bg-gray-100 p-4 overflow-auto">{text}</pre>);
      } else {
        setPreview(<p className="text-gray-500 text-center">Preview not available</p>);
      }
    } catch {
      alert('Preview failed');
    }
  };

  const handleDownload = async (id) => {
    const res = await fetch(`http://localhost:5000/api/files/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'downloaded_file';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    await fetch(`http://localhost:5000/api/files/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFiles();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert('Please select a file');

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    try {
      const res = await fetch('http://localhost:5000/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      alert('File uploaded!');
      setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      alert('Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <button onClick={handleLogout} className="text-red-600 hover:underline">Logout</button>
        </div>

        {/* Upload Section */}
        <form onSubmit={handleUpload} className="mb-6 space-y-3">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>

        {/* File List */}
        <h3 className="text-lg font-medium mb-3">Uploaded Files</h3>
        {loading ? (
          <p>Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-gray-500">No files found.</p>
        ) : (
          <ul className="divide-y border rounded">
            {files.map((file) => (
              <li key={file.id} className="p-4 flex justify-between items-start flex-col md:flex-row md:items-center">
                <div className="flex-1 mb-2 md:mb-0">
                  <p className="font-medium truncate">{file.filename}</p>
                  <p className="text-sm text-gray-600">
                    Size: {formatBytes(file.size)} | Uploaded: {new Date(file.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handlePreview(file)}
                    className="text-blue-500 hover:underline"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownload(file.id)}
                    className="text-green-500 hover:underline"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Preview Section */}
        {preview && (
          <div className="mt-8 p-4 border rounded-lg bg-white shadow">
            <h4 className="text-lg font-semibold mb-2">File Preview</h4>
            {preview}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
