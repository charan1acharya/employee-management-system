import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const DEFAULT_API_URL = 'http://13.204.53.118:8080/employees'
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL
const initialForm = { name: '', email: '', salary: '' }

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

function App() {
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const fetchEmployees = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(API_URL)
      setEmployees(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError('Unable to load employees. Please confirm the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const query = debouncedSearch
      if (!query) return true
      return (
        (employee.name || '').toLowerCase().includes(query) ||
        (employee.email || '').toLowerCase().includes(query) ||
        String(employee.id).includes(query)
      )
    })
  }, [employees, debouncedSearch])

  const sortedEmployees = useMemo(() => {
    const arr = [...filteredEmployees]
    arr.sort((a, b) => {
      const av = a[sortBy] ?? ''
      const bv = b[sortBy] ?? ''
      if (sortBy === 'salary' || sortBy === 'id') {
        return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      }
      const A = String(av).toLowerCase()
      const B = String(bv).toLowerCase()
      if (A < B) return sortDir === 'asc' ? -1 : 1
      if (A > B) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filteredEmployees, sortBy, sortDir])

  const totalPayroll = employees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0)
  const averageSalary = employees.length ? totalPayroll / employees.length : 0

  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / pageSize))
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1) }, [totalPages])
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedEmployees.slice(start, start + pageSize)
  }, [sortedEmployees, currentPage, pageSize])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleSort = (column) => {
    if (sortBy === column) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(column); setSortDir('asc') }
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      salary: employee.salary?.toString() || '',
    })
    setError('')
    setSuccess(`Editing ${employee.name}`)
  }

  const handleCancelEdit = () => {
    setEditingEmployee(null)
    setFormData(initialForm)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Delete this employee? This action cannot be undone.')
    if (!confirmDelete) return

    setError('')
    setSuccess('')
    try {
      setLoading(true)
      await axios.delete(`${API_URL}/${id}`)
      setSuccess('Employee deleted successfully.')
      await fetchEmployees()
    } catch (err) {
      setError('Could not delete employee. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim() || !formData.email.trim() || !formData.salary.trim()) {
      setError('Please fill out every field before saving an employee.')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const salaryValue = Number(formData.salary)
    if (Number.isNaN(salaryValue) || salaryValue <= 0) {
      setError('Salary must be a positive number.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      salary: salaryValue,
    }

    try {
      setSaving(true)
      if (editingEmployee) {
        await axios.put(`${API_URL}/${editingEmployee.id}`, payload)
        setSuccess('Employee updated successfully.')
      } else {
        await axios.post(API_URL, payload)
        setSuccess('Employee added successfully.')
      }
      setFormData(initialForm)
      setEditingEmployee(null)
      await fetchEmployees()
    } catch (err) {
      setError('Could not save employee. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employee Management</p>
          <h1>Team roster & payroll dashboard</h1>
          <p className="description">
            Manage employee records quickly with a modern React frontend using Axios, hooks, and responsive components.
          </p>
        </div>
        <div className="summary-grid">
          <div className="stats-card">
            <span>Total employees</span>
            <strong>{employees.length}</strong>
          </div>
          <div className="stats-card">
            <span>Total payroll</span>
            <strong>₹{totalPayroll.toFixed(2)}</strong>
          </div>
          <div className="stats-card">
            <span>Average salary</span>
            <strong>₹{averageSalary.toFixed(2)}</strong>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel card form-panel">
          <div className="panel-header">
            <div>
              <h2>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
              <p>{editingEmployee ? 'Update employee details and save changes.' : 'Enter name, email, and salary to create a new employee profile.'}</p>
            </div>
            <span className="status-pill">{editingEmployee ? 'Editing' : 'Fast create'}</span>
          </div>

          <form className="employee-form" onSubmit={handleSubmit} noValidate>
            {error ? <div className="alert alert-error">{error}</div> : null}
            {success ? <div className="alert alert-success">{success}</div> : null}

            <label className="form-field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
            </label>

            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jane.doe@example.com"
              />
            </label>

            <label className="form-field">
              <span>Salary</span>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="50000"
                min="0"
              />
            </label>

            <div className="form-action-row">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Saving employee...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
              </button>
              {editingEmployee ? (
                <button type="button" className="secondary-button" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel card table-panel">
          <div className="panel-header">
            <div>
              <h2>Employee list</h2>
              <p>{loading ? 'Fetching employees...' : `Live list from the backend API (${sortedEmployees.length} records shown).`}</p>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={fetchEmployees}
                disabled={loading || saving}
              >
                {loading ? 'Refreshing...' : 'Refresh list'}
              </button>
              <span className="status-pill">{loading ? 'Loading' : 'Active'}</span>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search by name, email, or ID"
            />
          </div>

          {loading ? (
            <div className="empty-state">Loading employee records...</div>
          ) : employees.length === 0 ? (
            <div className="empty-state">No employees available yet.</div>
          ) : sortedEmployees.length === 0 ? (
            <div className="empty-state">No employees matched your search.</div>
          ) : (
            <div className="table-wrapper">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable">ID {sortBy==='id'?(sortDir==='asc'? '▲':'▼'):''}</th>
                    <th onClick={() => handleSort('name')} className="sortable">Name {sortBy==='name'?(sortDir==='asc'? '▲':'▼'):''}</th>
                    <th onClick={() => handleSort('email')} className="sortable">Email {sortBy==='email'?(sortDir==='asc'? '▲':'▼'):''}</th>
                    <th onClick={() => handleSort('salary')} className="sortable">Salary {sortBy==='salary'?(sortDir==='asc'? '▲':'▼'):''}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.id}</td>
                      <td>{employee.name}</td>
                      <td>{employee.email}</td>
                      <td>₹{Number(employee.salary || 0).toLocaleString()}</td>
                      <td className="table-actions">
                        <button type="button" className="edit-button" onClick={() => handleEdit(employee)}>
                          Edit
                        </button>
                        <button type="button" className="delete-button" onClick={() => handleDelete(employee.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pagination-row">
            <div className="pagination-controls">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
              <span>Page {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
            <div className="page-size">
              <label>Rows: <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select></label>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
