import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable, ItemData } from "@/components/data-table";
import SectionCards from "@/components/section-cards";
import { prisma } from "@/lib/db";

async function getItemsForDataTable(): Promise<ItemData[]> {
  // Tambahkan ini untuk simulasi delay (misalnya 3 detik)
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Hapus ini setelah pengujian

  const items = await prisma.item.findMany({
    include: {
      kategori: true,
      supplier: true,
      detailTransaksi: {
        // Diubah ke detailTransaksiPenjualan sesuai skema
        select: {
          jumlah: true,
        },
      },
    },
  });

  return items.map((item) => {
    const totalTerjual = item.detailTransaksi.reduce(
      // atau item.detailTransaksiPenjualan
      (sum, detail) => sum + detail.jumlah,
      0
    );
    return {
      id: item.id,
      namaProduk: item.nama,
      category: item.kategori?.nama || "N/A",
      manufacture: item.manufacture || "N/A",
      terjual: totalTerjual,
      stok: item.stok,
      supplier: item.supplier?.nama || "N/A",
    };
  });
}

const DashboardPage = async () => {
  const itemsData = await getItemsForDataTable();

  return (
    <div>
      <div className="mt-5">
        <SectionCards />
      </div>
      <div className="m-6">
        <ChartAreaInteractive />
      </div>
      <div className="mb-6">
        <DataTable data={itemsData} />
      </div>
    </div>
  );
};
export default DashboardPage;
