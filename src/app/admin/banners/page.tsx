"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Banner = {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  type: 'MAIN_LARGE' | 'MAIN_SMALL';
  clickAction: 'LINK' | 'INVESTIGATOR' | 'ORGANIZATION';
  targetId: number | null;
  isActive: boolean;
  order: number;
};

type SimpleInvestigator = {
  id: number;
  user: {
    name: string;
  };
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [investigators, setInvestigators] = useState<SimpleInvestigator[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Banner>>({
    type: 'MAIN_LARGE',
    clickAction: 'LINK',
    targetId: null,
    isActive: true,
    order: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBanners();
    fetchInvestigators();
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

  const fetchInvestigators = async () => {
    try {
      // Fetch only approved investigators for the select box
      const res = await fetch('/api/investigators?status=APPROVED');
      if (res.ok) {
        const data = await res.json();
        setInvestigators(data.investigators || []);
      }
    } catch (error) {
      console.error('Failed to fetch investigators', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await res.json();
      setFormData(prev => ({ ...prev, imageUrl: data.url }));
    } catch (error) {
      console.error('Failed to upload file', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
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
        body: JSON.stringify({
            ...formData,
            targetId: formData.targetId ? parseInt(String(formData.targetId)) : null
        }),
      });
      if (res.ok) {
        fetchBanners();
        setFormData({ type: 'MAIN_LARGE', clickAction: 'LINK', targetId: null, isActive: true, order: 0, title: '', imageUrl: '', linkUrl: '' });
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-xs"
                  placeholder="URL 입력 또는 파일 업로드"
                  required
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploading}
              />
              {uploading && <p className="text-xs text-blue-500 mt-1">업로드 중...</p>}
            </div>

            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">클릭 액션</label>
                  <select
                    value={formData.clickAction}
                    onChange={(e) => setFormData({ ...formData, clickAction: e.target.value as Banner['clickAction'], targetId: null })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                  >
                    <option value="LINK">외부 링크 이동</option>
                    <option value="INVESTIGATOR">조사원 상세 팝업</option>
                  </select>
                </div>
                
                {formData.clickAction === 'LINK' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">링크 URL</label>
                      <input
                        type="text"
                        value={formData.linkUrl || ''}
                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                        placeholder="https://..."
                      />
                    </div>
                ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">대상 조사원 선택</label>
                      <select
                        value={formData.targetId || ''}
                        onChange={(e) => setFormData({ ...formData, targetId: e.target.value ? parseInt(e.target.value) : null })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                        required
                      >
                        <option value="">조사원을 선택하세요</option>
                        {investigators.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.user.name} (ID: {inv.id})
                          </option>
                        ))}
                      </select>
                    </div>
                )}
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
                    setFormData({ type: 'MAIN_LARGE', clickAction: 'LINK', targetId: null, isActive: true, order: 0, title: '', imageUrl: '', linkUrl: '' });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              )}
            </div>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-2">💡 팁</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
              <li><strong>조사원 상세 팝업:</strong> 목록에서 조사원을 선택하면 배너 클릭 시 해당 조사원의 프로필이 뜹니다.</li>
              <li>목록에 없는 경우 해당 조사원이 '승인(APPROVED)' 상태인지 확인하세요.</li>
            </ul>
          </div>
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
                  <p className="text-sm text-gray-500">
                    {banner.type} | {banner.clickAction === 'INVESTIGATOR' ? '조사원 팝업' : '외부 링크'} 
                    {banner.clickAction === 'INVESTIGATOR' ? ` (${investigators.find(i => i.id === banner.targetId)?.user.name || `ID: ${banner.targetId}`})` : ''}
                  </p>
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
