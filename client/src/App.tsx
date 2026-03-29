import { useState, useEffect } from 'react'
import './App.css'

interface User {
  id: number
  name: string
  email: string
}

interface Trip {
  id: number
  name: string
  destination: string
  invite_code: string
  role: string
}

interface VoteOption {
  id: number
  option_type: string
  option_value: string
  created_by_name: string
  vote_count: string
}

interface Activity {
  id: number
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  cost_estimate: number
}

interface Day {
  id: number
  day_number: number
  date: string
  activities: Activity[]
}

function App() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  
  const [trips, setTrips] = useState<Trip[]>([])
  const [showCreateTrip, setShowCreateTrip] = useState(false)
  const [showJoinTrip, setShowJoinTrip] = useState(false)
  const [tripName, setTripName] = useState('')
  const [destination, setDestination] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([])
  const [userVotes, setUserVotes] = useState<number[]>([])
  const [newOption, setNewOption] = useState('')
  const [optionType, setOptionType] = useState<'date' | 'place'>('date')

  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [loadingAI, setLoadingAI] = useState(false)

  // Budget state
  const [showBudget, setShowBudget] = useState(false)
  const [expenses, setExpenses] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category: 'food' })

  // Itinerary state
  const [activeTab, setActiveTab] = useState<'voting' | 'budget' | 'itinerary'>('voting')
  const [days, setDays] = useState<Day[]>([])
  const [newActivity, setNewActivity] = useState({ dayId: 0, title: '', location: '', startTime: '' })

  useEffect(() => {
    if (user) {
      fetchTrips()
    }
  }, [user])

  useEffect(() => {
    if (selectedTrip && user) {
      fetchVoteOptions()
      fetchUserVotes()
    }
  }, [selectedTrip])

  const fetchTrips = async () => {
    try {
      const response = await fetch(`http://localhost:5000/trips/user/${user?.id}`)
      const data = await response.json()
      setTrips(data.trips || [])
    } catch (err) {
      console.error('Failed to fetch trips')
    }
  }

  const fetchVoteOptions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/votes/options/${selectedTrip?.id}`)
      const data = await response.json()
      setVoteOptions(data.options || [])
    } catch (err) {
      console.error('Failed to fetch options')
    }
  }

  const fetchUserVotes = async () => {
    try {
      const response = await fetch(`http://localhost:5000/votes/user-votes/${selectedTrip?.id}/${user?.id}`)
      const data = await response.json()
      setUserVotes(data.votedOptionIds || [])
    } catch (err) {
      console.error('Failed to fetch user votes')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const endpoint = isLogin ? 'login' : 'signup'
    const body = isLogin 
      ? { email, password } 
      : { email, password, name }

    try {
      const response = await fetch(`http://localhost:5000/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
      }
    } catch (err) {
      setError('Something went wrong')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setTrips([])
    setSelectedTrip(null)
    setEmail('')
    setPassword('')
    setName('')
  }

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5000/trips/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tripName,
          destination: destination,
          userId: user?.id
        }),
      })

      const data = await response.json()
      if (data.trip) {
        setTrips([{ ...data.trip, role: 'owner' }, ...trips])
        setTripName('')
        setDestination('')
        setShowCreateTrip(false)
      }
    } catch (err) {
      console.error('Failed to create trip')
    }
  }

  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const response = await fetch('http://localhost:5000/trips/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode,
          userId: user?.id
        }),
      })

      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else if (data.trip) {
        fetchTrips()
        setInviteCode('')
        setShowJoinTrip(false)
      }
    } catch (err) {
      console.error('Failed to join trip')
    }
  }

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOption.trim()) return

    try {
      const response = await fetch('http://localhost:5000/votes/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip?.id,
          optionType: optionType,
          optionValue: newOption,
          userId: user?.id
        }),
      })

      const data = await response.json()
      if (data.option) {
        fetchVoteOptions()
        setNewOption('')
      }
    } catch (err) {
      console.error('Failed to add option')
    }
  }

  const handleVote = async (optionId: number) => {
    try {
      const response = await fetch('http://localhost:5000/votes/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionId: optionId,
          userId: user?.id
        }),
      })

      const data = await response.json()
      if (data.voted) {
        setUserVotes([...userVotes, optionId])
      } else {
        setUserVotes(userVotes.filter(id => id !== optionId))
      }
      fetchVoteOptions()
    } catch (err) {
      console.error('Failed to vote')
    }
  }

  const handleGetAISuggestions = async () => {
    setLoadingAI(true)
    try {
      const response = await fetch('http://localhost:5000/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: selectedTrip?.destination,
          tripName: selectedTrip?.name,
        }),
      })

      const data = await response.json()
      if (data.suggestions) {
        setAiSuggestions(data.suggestions)
        setShowAISuggestions(true)
      }
    } catch (err) {
      console.error('Failed to get AI suggestions')
    }
    setLoadingAI(false)
  }

  const handleAddAISuggestion = (suggestion: any) => {
    setOptionType('place')
    setNewOption(suggestion.name)
  }

  const fetchBudgetData = async () => {
    try {
      const [expensesRes, balancesRes, membersRes] = await Promise.all([
        fetch(`http://localhost:5000/expenses/trip/${selectedTrip?.id}`),
        fetch(`http://localhost:5000/expenses/balances/${selectedTrip?.id}`),
        fetch(`http://localhost:5000/expenses/members/${selectedTrip?.id}`)
      ])
      
      const expensesData = await expensesRes.json()
      const balancesData = await balancesRes.json()
      const membersData = await membersRes.json()
      
      setExpenses(expensesData.expenses || [])
      setBalances(balancesData.balances || [])
      setMembers(membersData.members || [])
    } catch (err) {
      console.error('Failed to fetch budget data')
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpense.amount || !newExpense.description) return

    try {
      const response = await fetch('http://localhost:5000/expenses/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip?.id,
          paidBy: user?.id,
          amount: parseFloat(newExpense.amount),
          description: newExpense.description,
          category: newExpense.category,
          splitWith: members.map(m => m.id)
        }),
      })

      const data = await response.json()
      if (data.expense) {
        setNewExpense({ amount: '', description: '', category: 'food' })
        fetchBudgetData()
      }
    } catch (err) {
      console.error('Failed to add expense')
    }
  }

  const handleOpenBudget = () => {
    setActiveTab('budget')
    fetchBudgetData()
  }

  // Itinerary functions
  const fetchItinerary = async () => {
    try {
      const response = await fetch(`http://localhost:5000/itinerary/trip/${selectedTrip?.id}`)
      const data = await response.json()
      setDays(data.days || [])
    } catch (err) {
      console.error('Failed to fetch itinerary')
    }
  }

  const handleOpenItinerary = () => {
    setActiveTab('itinerary')
    fetchItinerary()
  }

  const handleAddDay = async () => {
    try {
      const nextDayNumber = days.length + 1
      const response = await fetch('http://localhost:5000/itinerary/days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip?.id,
          dayNumber: nextDayNumber
        }),
      })

      const data = await response.json()
      if (data.day) {
        fetchItinerary()
      }
    } catch (err) {
      console.error('Failed to add day')
    }
  }

  const handleAddActivity = async (dayId: number) => {
    if (!newActivity.title) return

    try {
      const response = await fetch('http://localhost:5000/itinerary/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId: dayId,
          title: newActivity.title,
          location: newActivity.location,
          startTime: newActivity.startTime || null,
          userId: user?.id
        }),
      })

      const data = await response.json()
      if (data.activity) {
        setNewActivity({ dayId: 0, title: '', location: '', startTime: '' })
        fetchItinerary()
      }
    } catch (err) {
      console.error('Failed to add activity')
    }
  }

  const handleDeleteActivity = async (activityId: number) => {
    try {
      await fetch(`http://localhost:5000/itinerary/activities/${activityId}`, {
        method: 'DELETE'
      })
      fetchItinerary()
    } catch (err) {
      console.error('Failed to delete activity')
    }
  }

  const handleDeleteDay = async (dayId: number) => {
    try {
      await fetch(`http://localhost:5000/itinerary/days/${dayId}`, {
        method: 'DELETE'
      })
      fetchItinerary()
    } catch (err) {
      console.error('Failed to delete day')
    }
  }

  // Login/Signup screen
  if (!user) {
    return (
      <div className="container">
        <h1>TripSync</h1>
        <p>Plan trips with friends</p>
        
        <div className="tabs">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    )
  }

  // Trip detail view
  if (selectedTrip) {
    const dateOptions = voteOptions.filter(o => o.option_type === 'date')
    const placeOptions = voteOptions.filter(o => o.option_type === 'place')

    return (
      <div className="container">
        <button className="back-btn" onClick={() => { setSelectedTrip(null); setActiveTab('voting'); }}>
          ← Back to trips
        </button>
        
        <div className="trip-header">
          <h1>{selectedTrip.name}</h1>
          <p>📍 {selectedTrip.destination}</p>
          <p className="invite-code">Invite code: <strong>{selectedTrip.invite_code}</strong></p>
        </div>

        <div className="tab-toggle">
          <button 
            className={`toggle-btn ${activeTab === 'voting' ? 'active' : ''}`}
            onClick={() => setActiveTab('voting')}
          >
            🗳️ Voting
          </button>
          <button 
            className={`toggle-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={handleOpenItinerary}
          >
            📅 Itinerary
          </button>
          <button 
            className={`toggle-btn ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={handleOpenBudget}
          >
            💰 Budget
          </button>
        </div>

        {activeTab === 'voting' && (
          <div className="voting-section">
            <h2>Vote on Options</h2>

            <button 
              className="ai-btn" 
              onClick={handleGetAISuggestions}
              disabled={loadingAI}
            >
              {loadingAI ? '🤖 Getting suggestions...' : '🤖 Get AI Suggestions'}
            </button>

            {showAISuggestions && aiSuggestions.length > 0 && (
              <div className="ai-suggestions">
                <h3>✨ AI Suggestions for {selectedTrip?.destination}</h3>
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-card">
                    <div className="suggestion-info">
                      <strong>{suggestion.name}</strong>
                      <p>{suggestion.description}</p>
                      <span className="suggestion-meta">{suggestion.cost} • {suggestion.bestTime}</span>
                    </div>
                    <button onClick={() => handleAddAISuggestion(suggestion)}>+ Add</button>
                  </div>
                ))}
                <button className="close-btn" onClick={() => setShowAISuggestions(false)}>Close</button>
              </div>
            )}
            
            <form onSubmit={handleAddOption} className="add-option-form">
              <select value={optionType} onChange={(e) => setOptionType(e.target.value as 'date' | 'place')}>
                <option value="date">📅 Date</option>
                <option value="place">📍 Place</option>
              </select>
              <input
                type="text"
                placeholder={optionType === 'date' ? 'e.g., March 15-20' : 'e.g., Beach Resort'}
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>

            {dateOptions.length > 0 && (
              <div className="option-group">
                <h3>📅 Dates</h3>
                {dateOptions.map(option => (
                  <div 
                    key={option.id} 
                    className={`option-card ${userVotes.includes(option.id) ? 'voted' : ''}`}
                    onClick={() => handleVote(option.id)}
                  >
                    <span className="option-value">{option.option_value}</span>
                    <span className="vote-count">{option.vote_count} votes</span>
                  </div>
                ))}
              </div>
            )}

            {placeOptions.length > 0 && (
              <div className="option-group">
                <h3>📍 Places</h3>
                {placeOptions.map(option => (
                  <div 
                    key={option.id} 
                    className={`option-card ${userVotes.includes(option.id) ? 'voted' : ''}`}
                    onClick={() => handleVote(option.id)}
                  >
                    <span className="option-value">{option.option_value}</span>
                    <span className="vote-count">{option.vote_count} votes</span>
                  </div>
                ))}
              </div>
            )}

            {voteOptions.length === 0 && (
              <p className="no-options">No options yet. Add some dates or places to vote on!</p>
            )}
          </div>
        )}

        {activeTab === 'itinerary' && (
          <div className="itinerary-section">
            <h2>📅 Trip Itinerary</h2>
            
            <button className="add-day-btn" onClick={handleAddDay}>
              + Add Day
            </button>

            {days.length === 0 && (
              <p className="no-days">No days planned yet. Add a day to get started!</p>
            )}

            {days.map((day) => (
              <div key={day.id} className="day-card">
                <div className="day-header">
                  <h3>Day {day.day_number}</h3>
                  <button className="delete-btn" onClick={() => handleDeleteDay(day.id)}>🗑️</button>
                </div>

                {day.activities.map((activity) => (
                  <div key={activity.id} className="activity-card">
                    <div className="activity-info">
                      <strong>{activity.title}</strong>
                      {activity.location && <span>📍 {activity.location}</span>}
                      {activity.start_time && <span>🕐 {activity.start_time}</span>}
                    </div>
                    <button className="delete-btn small" onClick={() => handleDeleteActivity(activity.id)}>✕</button>
                  </div>
                ))}

                <div className="add-activity-form">
                  <input
                    type="text"
                    placeholder="Activity name"
                    value={newActivity.dayId === day.id ? newActivity.title : ''}
                    onChange={(e) => setNewActivity({ ...newActivity, dayId: day.id, title: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Location (optional)"
                    value={newActivity.dayId === day.id ? newActivity.location : ''}
                    onChange={(e) => setNewActivity({ ...newActivity, dayId: day.id, location: e.target.value })}
                  />
                  <input
                    type="time"
                    value={newActivity.dayId === day.id ? newActivity.startTime : ''}
                    onChange={(e) => setNewActivity({ ...newActivity, dayId: day.id, startTime: e.target.value })}
                  />
                  <button onClick={() => handleAddActivity(day.id)}>Add</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="budget-section">
            <h2>💰 Trip Budget</h2>
            
            <form onSubmit={handleAddExpense} className="expense-form">
              <input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                step="0.01"
              />
              <input
                type="text"
                placeholder="What was it for?"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              />
              <select 
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
              >
                <option value="food">🍕 Food</option>
                <option value="transport">🚗 Transport</option>
                <option value="activities">🎢 Activities</option>
                <option value="accommodation">🏨 Accommodation</option>
                <option value="other">📦 Other</option>
              </select>
              <button type="submit">Add Expense</button>
            </form>

            {balances.length > 0 && (
              <div className="balances">
                <h3>Balances</h3>
                {balances.map((b, i) => (
                  <div key={i} className={`balance-card ${b.balance >= 0 ? 'positive' : 'negative'}`}>
                    <span className="balance-name">{b.name}</span>
                    <span className="balance-amount">
                      {b.balance >= 0 ? `+$${b.balance.toFixed(2)}` : `-$${Math.abs(b.balance).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {expenses.length > 0 && (
              <div className="expenses-list">
                <h3>Expenses</h3>
                {expenses.map((exp, i) => (
                  <div key={i} className="expense-card">
                    <div className="expense-info">
                      <strong>{exp.description}</strong>
                      <span>{exp.paid_by_name} paid</span>
                    </div>
                    <span className="expense-amount">${parseFloat(exp.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {expenses.length === 0 && (
              <p className="no-expenses">No expenses yet. Add one above!</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Dashboard
  return (
    <div className="container">
      <div className="header">
        <h1>Welcome, {user.name}! 🎉</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="actions">
        <button onClick={() => setShowCreateTrip(true)}>+ Create Trip</button>
        <button onClick={() => setShowJoinTrip(true)}>Join Trip</button>
      </div>

      {showCreateTrip && (
        <div className="modal">
          <form onSubmit={handleCreateTrip}>
            <h2>Create a Trip</h2>
            <input
              type="text"
              placeholder="Trip name (e.g., Spring Break 2026)"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Destination (e.g., Miami)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
            <div className="modal-buttons">
              <button type="submit">Create</button>
              <button type="button" onClick={() => setShowCreateTrip(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showJoinTrip && (
        <div className="modal">
          <form onSubmit={handleJoinTrip}>
            <h2>Join a Trip</h2>
            <input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <div className="modal-buttons">
              <button type="submit">Join</button>
              <button type="button" onClick={() => { setShowJoinTrip(false); setError(''); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="trips">
        <h2>Your Trips</h2>
        {trips.length === 0 ? (
          <p className="no-trips">No trips yet. Create one or join with an invite code!</p>
        ) : (
          trips.map((trip) => (
            <div 
              key={trip.id} 
              className="trip-card clickable"
              onClick={() => setSelectedTrip(trip)}
            >
              <h3>{trip.name}</h3>
              <p>📍 {trip.destination}</p>
              <p className="invite-code">Invite code: <strong>{trip.invite_code}</strong></p>
              <span className="role">{trip.role}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App