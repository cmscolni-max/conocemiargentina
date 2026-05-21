
import React, { useState } from 'react';
import { OutdoorShop, Review } from '../types';
import { Icons } from '../constants';

interface ShopDetailsProps {
  shop: OutdoorShop;
  onBack: () => void;
}

export const ShopDetails: React.FC<ShopDetailsProps> = ({ shop, onBack }) => {
  const fallbackShopImage = 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&q=80&w=1200';
  const [localReviews, setLocalReviews] = useState<Review[]>(shop.reviews || []);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const hasGearRental = `${shop.specialty} ${shop.description || ''} ${(shop.reviews || []).map((review) => review.comment).join(' ')}`
    .toLowerCase()
    .includes('alquil');

  const handleCall = () => {
    if (shop.phone) window.location.href = `tel:${shop.phone}`;
  };

  const handleInstagram = () => {
    if (shop.instagram) {
      const handle = shop.instagram.replace('@', '');
      window.open(`https://instagram.com/${handle}`, '_blank');
    }
  };

  const handleWebsite = () => {
    if (shop.website) window.open(shop.website, '_blank');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const review: Review = {
      id: Date.now().toString(),
      userName: 'Tú',
      userAvatar: 'https://i.pravatar.cc/150?u=user_me',
      rating: newRating,
      comment: newComment,
      date: new Date().toLocaleDateString()
    };

    setLocalReviews([review, ...localReviews]);
    setNewComment('');
    setNewRating(5);
    setShowReviewForm(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= Math.round(rating) ? 'text-yellow-500' : 'text-stone-300'}>
            <Icons.Star />
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white z-[60] overflow-y-auto pb-32 animate-in slide-in-from-right duration-300">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <button onClick={onBack} className="p-2 rounded-xl bg-stone-50 text-stone-800 active:scale-90 transition-all">
          <Icons.ChevronLeft />
        </button>
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest italic">{shop.name}</h2>
        <div className="w-10"></div>
      </div>

      <div className="px-6 py-6">
        {/* Hero Image */}
        <div className="w-full h-64 rounded-[2.5rem] overflow-hidden shadow-2xl mb-8 border-4 border-stone-50">
          <img
            src={shop.image || fallbackShopImage}
            className="w-full h-full object-cover"
            alt={shop.name}
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = fallbackShopImage;
            }}
          />
        </div>

        {/* Title & Info Cards */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-black text-stone-900 tracking-tighter italic leading-none mb-2">{shop.name}</h1>
              <p className="text-emerald-700 text-xs font-black uppercase tracking-[0.2em]">{shop.specialty}</p>
            </div>
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl flex flex-col items-center gap-1 border border-emerald-100">
              <span className="font-black text-emerald-800 text-lg">{shop.rating}</span>
              {renderStars(shop.rating)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-50 p-5 rounded-[2rem] border border-stone-100">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Ubicación</p>
              <p className="text-xs font-bold text-stone-800 leading-tight">{shop.address}</p>
              <p className="text-[9px] font-black text-emerald-600 uppercase mt-2 tracking-tighter">{shop.province}</p>
            </div>
            <div className="bg-stone-50 p-5 rounded-[2rem] border border-stone-100">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Alquiler de equipo</p>
              <p className="text-xs font-bold text-stone-800 leading-tight">
                {hasGearRental ? 'Sí disponible' : 'No disponible'}
              </p>
              <p className="text-[9px] font-black text-emerald-600 uppercase mt-2 tracking-tighter">{shop.specialty}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-10">
          <button onClick={handleCall} className="flex-1 bg-stone-900 text-white py-4 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg">
            <Icons.Phone />
            <span className="text-[8px] font-black uppercase tracking-widest">Llamar</span>
          </button>
          <button onClick={handleInstagram} className="flex-1 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-4 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg">
            <Icons.Instagram />
            <span className="text-[8px] font-black uppercase tracking-widest">Instagram</span>
          </button>
          <button onClick={handleWebsite} className="flex-1 bg-emerald-800 text-white py-4 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg">
            <Icons.Globe />
            <span className="text-[8px] font-black uppercase tracking-widest">Web</span>
          </button>
        </div>

        <section className="mb-10">
          <h3 className="text-lg font-black text-stone-900 mb-4 border-l-4 border-emerald-600 pl-4 uppercase tracking-tighter italic">Nuestra Historia</h3>
          <p className="text-stone-500 text-sm leading-relaxed font-medium">{shop.description}</p>
        </section>

        {shop.branches && shop.branches.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-black text-stone-900 mb-4 border-l-4 border-emerald-600 pl-4 uppercase tracking-tighter italic">Sucursales</h3>
            <div className="space-y-3">
              {shop.branches.map((branch, i) => (
                <div key={i} className="flex items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <Icons.MapPin />
                  </div>
                  <span className="text-xs font-black text-stone-800 uppercase tracking-tight">{branch}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-stone-900 border-l-4 border-emerald-600 pl-4 uppercase tracking-tighter italic">Opiniones Técnicas</h3>
            <button 
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl"
            >
              {showReviewForm ? 'Cancelar' : 'Calificar'}
            </button>
          </div>

          {showReviewForm && (
            <form onSubmit={handleAddReview} className="mb-8 bg-stone-50 p-6 rounded-3xl border border-stone-100 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase mb-2">Tu Puntuación</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button 
                        key={s} 
                        type="button" 
                        onClick={() => setNewRating(s)}
                        className={`text-2xl transition-all ${s <= newRating ? 'text-yellow-500 scale-110' : 'text-stone-300'}`}
                      >
                        <Icons.Star />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase mb-2">Tu Experiencia</p>
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="¿Cómo fue la atención y el equipamiento?"
                    className="w-full bg-white border border-stone-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
                    rows={3}
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all">
                  Enviar Opinión
                </button>
              </div>
            </form>
          )}

          <div className="space-y-6">
            {localReviews.length > 0 ? (
              localReviews.map((review) => (
                <div key={review.id} className="border-b border-stone-50 pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={review.userAvatar} className="w-10 h-10 rounded-full border border-stone-100" alt={review.userName} />
                    <div>
                      <p className="text-xs font-black text-stone-800">{review.userName}</p>
                      <p className="text-[9px] text-stone-400 font-bold uppercase">{review.date}</p>
                    </div>
                    <div className="ml-auto">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-sm text-stone-500 font-medium leading-relaxed italic">"{review.comment}"</p>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-stone-400 font-bold uppercase tracking-widest py-8">Aún no hay opiniones.</p>
            )}
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-stone-100 flex gap-4 z-20">
        <button 
          onClick={handleWebsite}
          className="flex-1 bg-emerald-800 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all"
        >
          Visitar Tienda Online
        </button>
        <button 
          className="w-14 h-14 bg-stone-100 text-stone-600 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-stone-200"
          onClick={() => alert('Compartiendo local: ' + shop.name)}
        >
          <Icons.Share />
        </button>
      </div>
    </div>
  );
};
