import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://13.204.53.118:8080/employees'
const initialForm = { name: '', email: '', salary: '' }

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

function App() {
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchEmployees()
  }, [])

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
      const query = searchTerm.toLowerCase().trim()
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        String(employee.id).includes(query)
      )
    })
  }, [employees, searchTerm])

  const totalPayroll = employees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0)
  const averageSalary = employees.length ? totalPayroll / employees.length : 0

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
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
    if (!confirmDelete) {
      return
    }

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
              <p>{loading ? 'Fetching employees...' : `Live list from the backend API (${filteredEmployees.length} records shown).`}</p>
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
          ) : filteredEmployees.length === 0 ? (
            <div className="empty-state">No employees matched your search.</div>
          ) : (
            <div className="table-wrapper">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Salary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
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
        </section>
      </main>
    </div>
  )
}

export default App
