import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, Trash2, Plus, Minus, Users, MapPin, User, Star } from 'lucide-react';
import { fetchAllUsersWithAddresses, adminDeleteUser, adminAdjustUserPoints, type UserWithAddresses } from '../../lib/adminUserApi';

interface UsersPanelProps {
  onUserCountChange: (count: number) => void;
}

export function UsersPanel({ onUserCountChange }: UsersPanelProps) {
  const [users, setUsers] = useState<UserWithAddresses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await fetchAllUsersWithAddresses();
    setUsers(data);
    onUserCountChange(data.length);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(q) ||
      (user.nickname && user.nickname.toLowerCase().includes(q))
    );
  });

  const handleToggleExpand = (user: UserWithAddresses) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null);
      setEditError(null);
    } else {
      setExpandedUserId(user.id);
      setAdjustAmount(0);
      setEditError(null);
    }
  };

  const handleAdjustPoints = async (userId: string, operation: 'add' | 'subtract') => {
    if (adjustAmount <= 0) return;

    const result = await adminAdjustUserPoints(userId, adjustAmount, operation);
    if (result.error) {
      setEditError(result.error);
      return;
    }

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, points: result.newBalance! } : u
    ));
    setAdjustAmount(0);
    setEditError(null);
  };

  const handleDelete = async (userId: string) => {
    const result = await adminDeleteUser(userId);
    if (!result.error) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      onUserCountChange(users.length - 1);
    }
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Registered Users</h2>
              <p className="text-sm text-slate-500">{users.length} total user{users.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or nickname..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-4">
              <Users size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              {searchQuery ? 'No users match your search' : 'No registered users yet'}
            </p>
            <p className="text-slate-400 text-sm">
              {searchQuery ? 'Try a different search term' : 'Users will appear here after they register'}
            </p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isExpanded={expandedUserId === user.id}
              adjustAmount={adjustAmount}
              editError={editError}
              isDeleteConfirm={deleteConfirmId === user.id}
              onToggleExpand={() => handleToggleExpand(user)}
              onSetAdjustAmount={setAdjustAmount}
              onAddPoints={() => handleAdjustPoints(user.id, 'add')}
              onSubtractPoints={() => handleAdjustPoints(user.id, 'subtract')}
              onDeleteClick={() => setDeleteConfirmId(user.id)}
              onDeleteConfirm={() => handleDelete(user.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface UserCardProps {
  user: UserWithAddresses;
  isExpanded: boolean;
  adjustAmount: number;
  editError: string | null;
  isDeleteConfirm: boolean;
  onToggleExpand: () => void;
  onSetAdjustAmount: (val: number) => void;
  onAddPoints: () => void;
  onSubtractPoints: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function UserCard({
  user,
  isExpanded,
  adjustAmount,
  editError,
  isDeleteConfirm,
  onToggleExpand,
  onSetAdjustAmount,
  onAddPoints,
  onSubtractPoints,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: UserCardProps) {
  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggleExpand}
          className="p-0.5 hover:bg-slate-100 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </button>

        <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 truncate">{user.nickname || `@${user.email.split('@')[0]}`}</span>
          </div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">
            <Star size={11} className="fill-amber-500 text-amber-500" />
            {Number(Number(user.points).toFixed(2))} pts
          </span>
          {user.addresses.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
              {user.addresses.length} address{user.addresses.length !== 1 ? 'es' : ''}
            </span>
          )}
          <span className="text-xs text-slate-400 hidden sm:inline">{joinedDate}</span>

          <button
            onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isDeleteConfirm && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-700 mb-3">
            Delete user <strong>{user.nickname || user.email}</strong>? This will remove their profile and all saved addresses.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onDeleteCancel}
              className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteConfirm}
              className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3">
            {editError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                {editError}
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-500">Nickname</span>
                <span className="text-sm text-slate-800">{user.nickname || '-'}</span>
              </div>
              <span className="text-slate-200">|</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-500">Email</span>
                <span className="text-sm text-slate-800 truncate">{user.email}</span>
              </div>
              <span className="text-slate-200">|</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Balance</span>
                <span className="text-sm font-semibold text-slate-800">{Number(Number(user.points).toFixed(2))} pts</span>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustAmount || ''}
                  onChange={(e) => onSetAdjustAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <button
                  onClick={onAddPoints}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                  title="Add points"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={onSubtractPoints}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Subtract points"
                >
                  <Minus size={16} />
                </button>
              </div>
            </div>
          </div>

          {user.addresses.length > 0 && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 mt-2">Delivery Addresses</p>
              <div className="space-y-1.5">
                {user.addresses.map(addr => (
                  <div key={addr.id} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 flex items-center gap-2 min-w-0">
                    <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 flex-shrink-0">{addr.label}</span>
                    {addr.is_default && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-medium flex-shrink-0">
                        Default
                      </span>
                    )}
                    <span className="text-slate-300 flex-shrink-0">|</span>
                    <span className="text-xs text-slate-600 truncate">
                      <span className="font-medium text-slate-700">{addr.full_name}</span>
                      <span className="text-slate-300 mx-1.5">&middot;</span>
                      {addr.street_address}, {addr.postal_code} {addr.city}, {addr.country}
                      <span className="text-slate-300 mx-1.5">&middot;</span>
                      {addr.phone}
                      {addr.email && (
                        <>
                          <span className="text-slate-300 mx-1.5">&middot;</span>
                          {addr.email}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.addresses.length === 0 && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100">
              <p className="text-xs text-slate-400 py-3 text-center">No delivery addresses saved</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
