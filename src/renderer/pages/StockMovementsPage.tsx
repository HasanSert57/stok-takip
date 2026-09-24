import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StockMovement } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatDate, formatMovementType } from '../utils/formatters';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { ColumnDef } from '@tanstack/react-table';

export const StockMovementsPage: React.FC = () => {
  const { refreshSignal } = useApp();
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const fetchMovements = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.STOCK_MOVEMENTS);
    if (res.success && res.data) setMovements(res.data);
  };

  useEffect(() => {
    fetchMovements();
  }, [refreshSignal]);

  const columns: ColumnDef<StockMovement>[] = [
    {
      accessorKey: 'created_at',
      header: 'Tarih',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: 'product_name',
      header: 'Ürün Adı',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.original.product_name || '-'}</span>,
    },
    {
      accessorKey: 'product_barcode',
      header: 'Barkod',
      cell: ({ row }) => <span className="font-mono text-slate-600">{row.original.product_barcode || '-'}</span>,
    },
    {
      accessorKey: 'movement_type',
      header: 'İşlem Tipi',
      cell: ({ row }) => <Badge variant="info">{formatMovementType(row.original.movement_type)}</Badge>,
    },
    {
      accessorKey: 'quantity',
      header: 'Değişim Miktarı',
      cell: ({ row }) => {
        const isUp = row.original.quantity > 0;
        return (
          <span className={`font-bold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {isUp ? `+${row.original.quantity}` : row.original.quantity}
          </span>
        );
      },
    },
    {
      accessorKey: 'previous_stock',
      header: 'Önceki Stok',
      cell: ({ row }) => row.original.previous_stock,
    },
    {
      accessorKey: 'new_stock',
      header: 'Yeni Stok',
      cell: ({ row }) => <span className="font-bold">{row.original.new_stock}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Açıklama',
      cell: ({ row }) => <span className="text-slate-500">{row.original.description || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* TanStack Table */}
      <DataTable columns={columns} data={movements} searchPlaceholder="Ürün Adı, Barkod veya İşlem Arayın..." />
    </div>
  );
};
