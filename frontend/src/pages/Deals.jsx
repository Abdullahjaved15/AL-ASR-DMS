import React, { useState, useEffect } from 'react';
import { Handshake, Plus, DollarSign, TrendingUp, Calendar, UserCheck, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ImageViewerModal from '../components/ImageViewerModal';
import { formatPKR, parsePakistaniPrice, getPriceHint, normalizePriceInput } from '../utils/priceFormatter';

export default function Deals({ search, isAddModalOpen, setIsAddModalOpen }) {
  const { user, isAdmin } = useAuth();
  const [deals, setDeals] = useState([]);
  const [buyersList, setBuyersList] = useState([]);
  const [sellersList, setSellersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Image Modal state
  const [selectedSellerForImages, setSelectedSellerForImages] = useState(null);

  // Form state for closing a deal
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchDeals();
    fetchOptions();
  }, [search]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await api.getDeals({ search });
      setDeals(data);
    } catch (err) {
      console.error('Failed to fetch deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [buyersData, sellersData] = await Promise.all([
        api.getBuyers(),
        api.getSellers()
      ]);
      setBuyersList(buyersData.filter(b => b.leadStatus !== 'Deal Closed'));
      setSellersList(sellersData.filter(s => s.leadStatus !== 'Deal Closed'));
    } catch (err) {
      console.error('Failed to fetch options for deal modal:', err);
    }
  };

  const handleCloseDeal = async (e) => {
    e.preventDefault();
    if (!selectedBuyerId || !selectedSellerId || !dealPrice) {
      alert('Please select a buyer, a seller vehicle, and enter the final deal price.');
      return;
    }

    try {
      await api.createDeal({
        buyerId: selectedBuyerId,
        sellerId: selectedSellerId,
        dealPrice: normalizePriceInput(dealPrice),
        remarks
      });

      setIsAddModalOpen(false);
      setSelectedBuyerId('');
      setSelectedSellerId('');
      setDealPrice('');
      setRemarks('');
      fetchDeals();
      fetchOptions();
    } catch (err) {
      alert(err.message || 'Failed to close deal');
    }
  };

  // Profit calculation helper for live preview in modal
  const selectedSeller = sellersList.find(s => s.id === selectedSellerId);
  const numericDealPrice = dealPrice ? parsePakistaniPrice(dealPrice) : 0;
  const numericSellerDemand = selectedSeller ? parsePakistaniPrice(selectedSeller.demandPrice) : 0;
  const calculatedProfit = (selectedSeller && dealPrice)
    ? (numericDealPrice - numericSellerDemand)
    : null;

  const totalVolume = deals.reduce((sum, d) => sum + parsePakistaniPrice(d.dealPrice), 0);
  const totalProfit = deals.reduce((sum, d) => sum + parsePakistaniPrice(d.profit), 0);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Deals Closed</p>
            <h3 className="text-2xl font-extrabold text-white mt-0.5">{deals.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Handshake className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Closed Volume</p>
            <h3 className="text-2xl font-extrabold text-cyan-400 mt-0.5">{formatPKR(totalVolume)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Net Profit Generated</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-0.5">+{formatPKR(totalProfit)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Closed Transactions Ledger (PKR)</h3>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Finalize New Deal</span>
          </button>
        )}
      </div>

      {/* Deals Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Vehicle Details</th>
                <th className="py-3.5 px-4">Buyer Info</th>
                <th className="py-3.5 px-4">Demand Price</th>
                <th className="py-3.5 px-4">Final Deal Price</th>
                <th className="py-3.5 px-4">Profit Margin</th>
                <th className="py-3.5 px-4">Salesman</th>
                <th className="py-3.5 px-4">Photos</th>
                <th className="py-3.5 px-4">Closing Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-extrabold text-white text-sm">
                      {deal.seller?.vehicle} {deal.seller?.model}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Seller: {deal.seller?.sellerName} • {deal.seller?.year}
                    </p>
                  </td>

                  <td className="py-4 px-4">
                    <p className="font-semibold text-white">{deal.buyer?.buyerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{deal.buyer?.buyerPhone}</p>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-400">
                    {formatPKR(deal.seller?.demandPrice)}
                  </td>

                  <td className="py-4 px-4 font-mono font-extrabold text-cyan-400 text-sm">
                    {formatPKR(deal.dealPrice)}
                  </td>

                  <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                    {deal.profit !== null && deal.profit !== undefined && deal.profit !== '' 
                      ? (parsePakistaniPrice(deal.profit) >= 0 ? `+${formatPKR(deal.profit)}` : `-${formatPKR(Math.abs(parsePakistaniPrice(deal.profit)))}`)
                      : 'Rs. 0'}
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-300">
                    <div className="flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{deal.salesman?.name}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <button
                      onClick={() => setSelectedSellerForImages(deal.seller)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-400 rounded-lg font-mono text-[11px] flex items-center space-x-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>View ({deal.seller?.images?.length || 0})</span>
                    </button>
                  </td>

                  <td className="py-4 px-4 font-mono text-slate-400">
                    {new Date(deal.closingDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {deals.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-mono text-xs">
                    No closed deals recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER DEAL WORKFLOW MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-xl border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">Finalize & Register Deal</h3>
            <p className="text-xs text-slate-400 font-mono mb-6">
              Link buyer inquiry to seller vehicle, record closing price in PKR, and calculate profit.
            </p>

            <form onSubmit={handleCloseDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Select Seller Vehicle *</label>
                <select
                  required
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">-- Choose Vehicle Inventory --</option>
                  {sellersList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.vehicle} {s.model} ({s.year}) - Demand: {formatPKR(s.demandPrice)} [Seller: {s.sellerName}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Select Buyer *</label>
                <select
                  required
                  value={selectedBuyerId}
                  onChange={(e) => setSelectedBuyerId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">-- Choose Buyer Inquiry --</option>
                  {buyersList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.buyerName} ({b.vehicle} {b.model}) - Budget: {formatPKR(b.budget)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Final Sale / Deal Price (PKR / Rs.) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 40 lac, 1.5 crore, 4000000"
                  value={dealPrice}
                  onChange={(e) => setDealPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500 font-mono"
                />
                {Boolean(dealPrice) && Boolean(getPriceHint(dealPrice)) && (
                  <div className="mt-1 px-2.5 py-1 bg-cyan-950/70 border border-cyan-500/30 rounded-lg text-xs font-mono text-cyan-300 flex items-center justify-between animate-fadeIn">
                    <span className="text-[11px] text-cyan-400/70">Calculated:</span>
                    <span className="font-bold text-white text-xs">{getPriceHint(dealPrice)}</span>
                  </div>
                )}
              </div>

              {/* Profit Live Calculation Preview */}
              {calculatedProfit !== null && (
                <div className={`p-3 rounded-xl border font-mono text-xs flex items-center justify-between ${
                  calculatedProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <span>Estimated Profit Calculation:</span>
                  <span className="font-bold text-sm">
                    {calculatedProfit >= 0 ? `+${formatPKR(calculatedProfit)}` : `-${formatPKR(Math.abs(calculatedProfit))}`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Deal Remarks / Contract Notes</label>
                <textarea
                  rows="2"
                  placeholder="Payment method, biometric transfer status, warranty notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Confirm Deal & Update Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW IMAGES LIGHTBOX MODAL */}
      {selectedSellerForImages && (
        <ImageViewerModal
          seller={selectedSellerForImages}
          onClose={() => setSelectedSellerForImages(null)}
          onImagesUpdated={fetchDeals}
        />
      )}
    </div>
  );
}
