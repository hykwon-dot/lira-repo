"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Banner = {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  type: 'MAIN_LARGE' | 'MAIN_SMALL';
  isActive: boolean;
  order: number;
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Banner>>({
    type: 'MAIN_LARGE',
    isActive: true,
    order: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (error) {
      console.error('Failed to fetch banners', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/banners/${editingId}` : '/api/banners';
    const method = editingId ? 'PUT' : 'POST';
    const token = sessionStorage.getItem('lira.authToken');

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchBanners();
        setFormData({ type: 'MAIN_LARGE', isActive: true, order: 0, title: '', imageUrl: '', linkUrl: '' });
        setEditingId(null);
      } else {
        alert('Failed to save banner');
      }
    } catch (error) {
      console.error('Error saving banner', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    const token = sessionStorage.getItem('lira.authToken');
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchBanners();
      } else {
        alert('Failed to delete banner');
      }
    } catch (error) {
      console.error('Error deleting banner', error);
    }
  };

  const handleEdit = (banner: Banner) => {
    setFormData(banner);
    setEditingId(banner.id);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">배너 관리</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">돌아가기</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">{editingId ? '배너 수정' : '새 배너 추가'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">제목</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
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
              <label className="block text-sm font-medium text-gray-700">링크 URL</label>
              <input
                type="text"
                value={formData.linkUrl || ''}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">타입</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'MAIN_LARGE' | 'MAIN_SMALL' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              >
                <option value="MAIN_LARGE">메인 (큰 배너)</option>
                <option value="MAIN_SMALL">서브 (작은 배너)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">순서</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">활성화</label>
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
                    setFormData({ type: 'MAIN_LARGE', isActive: true, order: 0, title: '', imageUrl: '', linkUrl: '' });
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
            banners.map((banner) => (
              <div key={banner.id} className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
                <div className="w-24 h-16 bg-gray-200 relative overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.imageUrl} alt={banner.title || 'Banner'} className="object-cover w-full h-full" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{banner.title || '(제목 없음)'}</h3>
                  <p className="text-sm text-gray-500">{banner.type} | Order: {banner.order}</p>
                  <p className="text-xs text-gray-400">{banner.linkUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
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
