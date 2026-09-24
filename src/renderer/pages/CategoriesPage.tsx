import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryNode, Category } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Dialog, ConfirmDialog } from '../components/ui/Dialog';
import { Card } from '../components/ui/Card';
import { FolderTree, Plus, Edit2, Trash2, Folder } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { showToast, refreshSignal } = useApp();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  // Delete Confirm Modal
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const fetchCategories = async () => {
    const treeRes = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_TREE);
    if (treeRes.success && treeRes.data) setTree(treeRes.data);

    const listRes = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_LIST);
    if (listRes.success && listRes.data) setFlatCategories(listRes.data);
  };

  useEffect(() => {
    fetchCategories();
  }, [refreshSignal]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setParentId(null);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setName(c.name);
    setParentId(c.parent_id);
    setDescription(c.description || '');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      parent_id: parentId,
      description: description || null,
      is_active: true,
    };

    if (editingCategory) {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_UPDATE, { ...payload, id: editingCategory.id });
      if (res.success) {
        showToast('Kategori güncellendi', 'success');
        setIsModalOpen(false);
        fetchCategories();
      } else {
        showToast(res.error?.message || 'Güncelleme başarısız', 'danger');
      }
    } else {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_CREATE, payload);
      if (res.success) {
        showToast('Kategori oluşturuldu', 'success');
        setIsModalOpen(false);
        fetchCategories();
      } else {
        showToast(res.error?.message || 'Oluşturma başarısız', 'danger');
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCategoryId) return;

    const res = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_DELETE, { id: deleteCategoryId });
    if (res.success) {
      showToast('Kategori silindi', 'info');
      setDeleteCategoryId(null);
      fetchCategories();
    } else {
      showToast(res.error?.message || 'Kategori silinemedi', 'danger');
      setDeleteCategoryId(null);
    }
  };

  const renderTreeNode = (node: CategoryNode, depth = 0) => {
    return (
      <div key={node.id} style={{ marginLeft: `${depth * 24}px` }} className="mb-2">
        <Card className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
          <div className="flex items-center gap-3">
            <Folder className={depth === 0 ? 'text-blue-600' : 'text-cyan-600'} size={20} />
            <div>
              <span className="font-bold text-sm text-slate-800">{node.name}</span>
              {node.description && (
                <span className="ml-2 text-xs text-slate-400">({node.description})</span>
              )}
            </div>
            <Badge variant="info" className="ml-2">
              {node.productCount || 0} ürün
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(node)}>
              <Edit2 size={14} /> Düzenle
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteCategoryId(node.id)}>
              <Trash2 size={14} /> Sil
            </Button>
          </div>
        </Card>

        {node.children && node.children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <FolderTree size={20} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Kategori Hiyerarşi Ağacı</h3>
        </div>

        <Button onClick={handleOpenAdd}>
          <Plus size={16} /> Yeni Kategori Ekle
        </Button>
      </div>

      {/* Tree UI Container */}
      <div className="space-y-2">
        {tree.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 font-medium">
            Henüz kategori eklenmemiş. "Yeni Kategori Ekle" butonuna tıklayarak oluşturabilirsiniz.
          </Card>
        ) : (
          tree.map((node) => renderTreeNode(node))
        )}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Kategori Adı (Zorunlu)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Üst Kategori (Opsiyonel)"
            value={parentId || ''}
            onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">(Ana Kategori)</option>
            {flatCategories
              .filter((c) => !editingCategory || c.id !== editingCategory.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>

          <Input
            label="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              İptal
            </Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirm Modal */}
      <ConfirmDialog
        isOpen={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={handleConfirmDelete}
        title="Kategori Silme Onayı"
        description="Bu kategoriyi silmek istediğinize emin misiniz?"
        confirmText="Evet, Sil"
        variant="danger"
      />
    </div>
  );
};
