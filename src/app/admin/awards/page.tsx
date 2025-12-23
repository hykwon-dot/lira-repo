"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Award = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  date: string;
};

export default function AdminAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Award>>({
    date: new Date().toISOString().split('T')[0],
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    try {
      const res = await fetch('/api/awards');
      const data = await res.json();
      setAwards(data.awards || []);
    } catch (error) {
      console.error('Failed to fetch awards', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/awards/${editingId}` : '/api/awards';
    const method = editingId ? 'PUT' : 'POST';
    const token = sessionStorage.getItem('lira.authToken');

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date!).toISOString(),
        }),
      });
      if (res.ok) {
        fetchAwards();
        setFormData({ date: new Date().toISOString().split('T')[0], title: '', description: '', imageUrl: '' });
        setEditingId(null);
      } else {
        alert('Failed to save award');
      }
    } catch (error) {
      console.error('Error saving award', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    const token = sessionStorage.getItem('lira.authToken');
    try {
      const res = await fetch(`/api/awards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchAwards();
      } else {
        alert('Failed to delete award');
      }
    } catch (error) {
      console.error('Error deleting award', error);
    }
  };

  const handleEdit = (award: Award) => {
    setFormData({
      ...award,
      date: new Date(award.date).toISOString().split('T')[0],
    });
    setEditingId(award.id);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">수상 내역 관리</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">돌아가기</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">{editingId ? '수상 내역 수정' : '새 수상 내역 추가'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">제목</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">설명</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">이미지 URL</label>
              <input
                type="text"
                value={formData.imageUrl || ''}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">날짜</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                저장
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ date: new Date().toISOString().split('T')[0], title: '', description: '', imageUrl: '' });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            awards.map((award) => (
              <div key={award.id} className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
                <div className="w-24 h-16 bg-gray-200 relative overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={award.imageUrl} alt={award.title} className="object-cover w-full h-full" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{award.title}</h3>
                  <p className="text-sm text-gray-500">{new Date(award.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{award.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(award)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(award.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
