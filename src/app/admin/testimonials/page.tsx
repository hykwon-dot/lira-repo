"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Testimonial = {
  id: number;
  name: string;
  role: string | null;
  content: string;
  avatarUrl: string | null;
  isVisible: boolean;
  order: number;
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Testimonial>>({
    isVisible: true,
    order: 0,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const token = sessionStorage.getItem('lira.authToken');
      const res = await fetch('/api/admin/testimonials', {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
      });
      const data = await res.json();
      setTestimonials(data.testimonials || []);
    } catch (error) {
      console.error('Failed to fetch testimonials', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/admin/testimonials/${editingId}` : '/api/admin/testimonials';
    const method = editingId ? 'PUT' : 'POST';
    const token = sessionStorage.getItem('lira.authToken');

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchTestimonials();
        setFormData({ isVisible: true, order: 0, name: '', role: '', content: '', avatarUrl: '' });
        setEditingId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '후기를 저장하지 못했습니다.');
      }
    } catch (error) {
      console.error('Error saving testimonial', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('해당 후기를 삭제하시겠습니까?')) return;
    const token = sessionStorage.getItem('lira.authToken');
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        await fetchTestimonials();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '후기를 삭제하지 못했습니다.');
      }
    } catch (error) {
      console.error('Error deleting testimonial', error);
    }
  };

  const handleEdit = (item: Testimonial) => {
    setFormData({
      ...item,
    });
    setEditingId(item.id);
  };

  const handleToggleVisibility = async (item: Testimonial) => {
    const token = sessionStorage.getItem('lira.authToken');
    try {
      const res = await fetch(`/api/admin/testimonials/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });
      if (res.ok) {
        await fetchTestimonials();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '노출 상태를 변경하지 못했습니다.');
      }
    } catch (error) {
      console.error('Error toggling visibility', error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">이용자 후기 관리</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">돌아가기</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">{editingId ? '후기 수정' : '새 후기 추가'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">이름</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">직함 / 역할</label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">내용</label>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                rows={5}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">아바타 이미지 URL</label>
              <input
                type="text"
                value={formData.avatarUrl || ''}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">정렬 순서</label>
              <input
                type="number"
                value={formData.order ?? 0}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value || '0', 10) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isVisible ?? true}
                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">메인 페이지에 노출</label>
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
                    setFormData({ isVisible: true, order: 0, name: '', role: '', content: '', avatarUrl: '' });
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
          ) : testimonials.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 후기가 없습니다.</p>
          ) : (
            testimonials.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    {item.name}
                    <span className="text-xs text-gray-500">{item.role}</span>
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.isVisible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.isVisible ? '노출' : '비노출'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">정렬 순서: {item.order}</p>
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{item.content}</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleToggleVisibility(item)}
                    className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    {item.isVisible ? '비노출로 전환' : '노출로 전환'}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
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
