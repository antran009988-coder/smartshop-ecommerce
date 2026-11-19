import React, { useEffect, useState, useRef } from 'react';
import {
  ShoppingCart, Eye, Package, Sparkles, X, Trash2, Plus, Minus, CheckCircle,
  Search, ShieldAlert, Star, User, LogOut, CreditCard, QrCode, MessageSquare,
  History, MapPin, Ban, Send, Bot, Headphones, Cpu, Layers, BarChart3,
  Truck, CheckCheck, Clock, Flame, ChevronLeft, ChevronRight, PlusCircle
} from 'lucide-react';
interface Product {
  id: number;
  name: string;
  slug: string;
  base_price: number;
  view_count: number;
  rating: number;
  category_id: number;
  description: string;
  image_url: string;
  specs?: string;
}

interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  price_diff: number;
  stock: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CartItem {
  cartKey: string;
  id: number;
  name: string;
  slug: string;
  base_price: number;
  view_count: number;
  rating: number;
  category_id: number;
  description: string;
  image_url: string;
  quantity: number;
  variantName?: string;
  unitPrice: number;
}

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Order {
  id: number;
  username?: string;
  full_name: string;
  phone: string;
  address: string;
  payment_method: string;
  total_amount: number;
  items: string;
  status: string;
  created_at: string;
}

interface ChatMessage {
  sender: 'bot' | 'user' | 'agent';
  text: string;
  time?: string;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=500&q=80';

function parseSpecs(product: Product): { label: string; value: string }[] {
  if (product.specs && product.specs.trim()) {
    try {
      const parsed = JSON.parse(product.specs);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          label: String(item.label ?? item.key ?? 'Thông số'),
          value: String(item.value ?? '')
        }));
      }
    } catch {
      return product.specs
        .split('|')
        .map(part => part.trim())
        .filter(Boolean)
        .map((chunk, idx) => {
          const [k, ...rest] = chunk.split(':');
          return rest.length > 0
            ? { label: k.trim(), value: rest.join(':').trim() }
            : { label: `Hạng mục ${idx + 1}`, value: chunk };
        });
    }
  }
  return [
    { label: 'Danh mục ID', value: `#${product.category_id}` },
    { label: 'Bảo hành', value: '12 tháng chính hãng' },
    { label: 'Lượt xem', value: `${product.view_count} lượt` },
    { label: 'Đánh giá TB', value: `${product.rating} / 5.0 ⭐` },
    { label: 'Tình trạng', value: 'Mới 100% nguyên seal' }
  ];
}

function getNowTime(): string {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getOrderStatusBadge(status: string) {
  switch (status) {
    case 'cancelled':
      return {
        label: 'Đã hủy',
        cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      };
    case 'shipping':
      return {
        label: 'Đang giao hàng',
        cls: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
      };
    case 'delivered':
    case 'completed':
      return {
        label: 'Giao thành công',
        cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      };
    default:
      return {
        label: 'Chờ xử lý',
        cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      };
  }
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto Slider Banner State
  const [slideIndex, setSlideIndex] = useState<number>(0);

  // Auth State
  const [user, setUser] = useState<{ username: string; full_name: string; role: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', full_name: '' });

  // Cart & Product Detail Modals
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState({ rating: 5, comment: '' });

  // Checkout State
  const [isCheckoutModal, setIsCheckoutModal] = useState<boolean>(false);
  const [shippingInfo, setShippingInfo] = useState({ full_name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo' | 'cod'>('vnpay');
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);

  // Orders History State
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState<boolean>(false);

  // Upgraded Chatbot State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Xin chào! SmartShop AI có thể tư vấn cấu hình, biến thể sản phẩm, bảo hành hoặc kết nối chuyên viên cho bạn.',
      time: getNowTime()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isAgentMode, setIsAgentMode] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Admin Modal & States
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'stats' | 'orders' | 'products'>('stats');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    base_price: '',
    category_id: '1',
    image_url: '',
    description: '',
    specs: 'Bảo hành: 12 tháng chính hãng | Tình trạng: Mới 100%'
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const loadData = () => {
    Promise.all([
      fetch('http://localhost:5000/api/products').then(res => res.json()),
      fetch('http://localhost:5000/api/categories').then(res => res.json())
    ])
      .then(([prodData, catData]) => {
        setProducts(Array.isArray(prodData) ? prodData : []);
        setCategories(Array.isArray(catData) ? catData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const loadAdminOrders = () => {
    fetch('http://localhost:5000/api/admin/orders')
      .then(res => res.json())
      .then(data => setAdminOrders(Array.isArray(data) ? data : []))
      .catch(() => setAdminOrders([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tự động chạy banner quảng cáo qua vài sản phẩm mỗi 4 giây
  const featuredSlides = products.slice(0, 4);
  useEffect(() => {
    if (featuredSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % featuredSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [featuredSlides.length]);

  useEffect(() => {
    if (user) {
      setShippingInfo(prev => ({ ...prev, full_name: user.full_name }));
    }
  }, [user]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleOpenAdmin = () => {
    setIsAdminOpen(true);
    loadAdminOrders();
    loadData();
  };

  const handleUpdateOrderStatus = (orderId: number, status: string) => {
    fetch(`http://localhost:5000/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          loadAdminOrders();
        } else {
          alert('Không thể cập nhật trạng thái đơn hàng.');
        }
      })
      .catch(() => alert('Lỗi kết nối server!'));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Đã thêm sản phẩm mới thành công!');
          setNewProductForm({
            name: '',
            base_price: '',
            category_id: '1',
            image_url: '',
            description: '',
            specs: 'Bảo hành: 12 tháng chính hãng | Tình trạng: Mới 100%'
          });
          loadData();
        } else {
          alert(data.error || 'Lỗi thêm sản phẩm!');
        }
      })
      .catch(() => alert('Lỗi kết nối server!'));
  };

  const handleDeleteProduct = (productId: number, productName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}"?`)) return;
    fetch(`http://localhost:5000/api/admin/products/${productId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Đã xóa sản phẩm!');
          loadData();
        } else {
          alert('Không thể xóa sản phẩm!');
        }
      })
      .catch(() => alert('Lỗi kết nối server!'));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setIsAuthModalOpen(false);
          setLoginForm({ username: '', password: '' });
          alert(`Đăng nhập thành công! Chào mừng ${data.user.full_name}`);
        } else {
          alert(data.message);
        }
      })
      .catch(() => alert('Lỗi kết nối đến server!'));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Đăng ký tài khoản thành công!');
          setUser(data.user);
          setIsAuthModalOpen(false);
          setRegisterForm({ username: '', password: '', full_name: '' });
        } else {
          alert(data.message || 'Lỗi đăng ký!');
        }
      })
      .catch(() => alert('Lỗi kết nối đến server!'));
  };

  const openProductDetail = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedProduct(prod);
    setProductReviews([]);
    setVariants([]);
    setSelectedVariant(null);

    fetch(`http://localhost:5000/api/products/${prod.id}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProductReviews(data);
      })
      .catch(() => setProductReviews([]));

    fetch(`http://localhost:5000/api/products/${prod.id}/variants`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setVariants(data);
          setSelectedVariant(data[0]);
        } else {
          const fallbackVariants: ProductVariant[] = [
            { id: 1, product_id: prod.id, variant_name: 'Màu Đen - Tiêu chuẩn', price_diff: 0, stock: 20 },
            { id: 2, product_id: prod.id, variant_name: 'Màu Bạc - Bản nâng cấp', price_diff: 300000, stock: 12 }
          ];
          setVariants(fallbackVariants);
          setSelectedVariant(fallbackVariants[0]);
        }
      })
      .catch(() => {
        const fallbackVariants: ProductVariant[] = [
          { id: 1, product_id: prod.id, variant_name: 'Màu Đen - Tiêu chuẩn', price_diff: 0, stock: 20 }
        ];
        setVariants(fallbackVariants);
        setSelectedVariant(fallbackVariants[0]);
      });
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const author = user ? user.full_name : 'Khách vãng lai';
    fetch(`http://localhost:5000/api/products/${selectedProduct.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: author, rating: newComment.rating, comment: newComment.comment })
    })
      .then(res => res.json())
      .then(rev => {
        setProductReviews([rev, ...productReviews]);
        setNewComment({ rating: 5, comment: '' });
        alert('Đã gửi đánh giá thành công!');
      });
  };

  const addToCart = (
    product: Product,
    e?: React.MouseEvent,
    variant?: ProductVariant | null,
    customPrice?: number
  ) => {
    if (e) e.stopPropagation();
    const chosenVariant = variant || {
      id: 0,
      product_id: product.id,
      variant_name: customPrice !== undefined ? 'Giá Flash Sale (-15%)' : 'Mặc định',
      price_diff: 0,
      stock: 99
    };
    const base = customPrice !== undefined ? customPrice : Number(product.base_price);
    const finalUnitPrice = base + Number(chosenVariant.price_diff || 0);
    const key = `${product.id}-${chosenVariant.variant_name}`;

    setCart(prev => {
      const existing = prev.find(item => item.cartKey === key);
      if (existing) {
        return prev.map(item =>
          item.cartKey === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartKey: key,
          quantity: 1,
          variantName: chosenVariant.variant_name,
          unitPrice: finalUnitPrice
        }
      ];
    });
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingFee = totalPrice > 5000000 ? 0 : 30000;
  const grandTotal = totalPrice + shippingFee;
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Flash Sale 4 sản phẩm giảm 15%
  const saleProducts = products.slice(0, 4);

  const handleProceedCheckout = () => {
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản trước khi tiến hành đặt hàng!');
      setIsCartOpen(false);
      setIsAuthModalOpen(true);
      return;
    }
    setIsCheckoutModal(true);
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Vui lòng đăng nhập lại!');
      return;
    }

    const orderData = {
      username: user.username,
      full_name: shippingInfo.full_name,
      phone: shippingInfo.phone,
      address: shippingInfo.address,
      payment_method: paymentMethod,
      total_amount: grandTotal,
      items: cart
    };

    fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCheckoutSuccess(true);
          setTimeout(() => {
            setCart([]);
            setCheckoutSuccess(false);
            setIsCheckoutModal(false);
            setIsCartOpen(false);
            alert('Đặt hàng thành công!');
          }, 1500);
        } else {
          alert('Lỗi đặt hàng.');
        }
      })
      .catch(() => alert('Không thể kết nối máy chủ.'));
  };

  const fetchUserOrders = () => {
    if (!user) {
      alert('Vui lòng đăng nhập để xem lịch sử đơn hàng!');
      setIsAuthModalOpen(true);
      return;
    }
    fetch(`http://localhost:5000/api/orders/${user.username}`)
      .then(res => res.json())
      .then(data => {
        setUserOrders(Array.isArray(data) ? data : []);
        setIsOrdersModalOpen(true);
      });
  };

  const handleCancelOrder = (orderId: number) => {
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      fetch(`http://localhost:5000/api/orders/${orderId}/cancel`, { method: 'PUT' })
        .then(res => res.json())
        .then(() => {
          alert('Hủy đơn hàng thành công!');
          fetchUserOrders();
        });
    }
  };

  const switchToAgent = () => {
    setIsAgentMode(true);
    setChatMessages(prev => [
      ...prev,
      {
        sender: 'agent',
        text: 'Chào bạn, tôi là Minh — Chuyên viên kỹ thuật SmartShop. Bạn cần tư vấn thêm về biến thể hay thông số nào ạ?',
        time: getNowTime()
      }
    ]);
  };

  const generateSmartReply = (text: string, currentlyAgent: boolean): { reply: string; nextAgent: boolean } => {
    const lower = text.toLowerCase();
    if (lower.includes('chuyên viên') || lower.includes('nhân viên') || lower.includes('tư vấn viên')) {
      return {
        reply: 'Đã chuyển sang chế độ trò chuyện trực tiếp với chuyên viên tư vấn!',
        nextAgent: true
      };
    }
    if (currentlyAgent) {
      return {
        reply: `Chuyên viên đã ghi nhận yêu cầu "${text}". Chúng tôi sẽ hỗ trợ chi tiết ngay cho bạn.`,
        nextAgent: true
      };
    }
    if (lower.includes('biến thể') || lower.includes('màu') || lower.includes('phiên bản')) {
      return {
        reply: 'Bạn hãy bấm "Chi tiết" trên sản phẩm để chọn các biến thể (màu sắc, gói nâng cấp/bảo hành) với giá cập nhật tự động.',
        nextAgent: false
      };
    }
    if (lower.includes('thông số') || lower.includes('cấu hình')) {
      return {
        reply: 'Bảng thông số kỹ thuật chi tiết nằm ngay trong cửa sổ "Chi tiết" của từng sản phẩm.',
        nextAgent: false
      };
    }
    if (lower.includes('ship') || lower.includes('giao') || lower.includes('qr') || lower.includes('thanh toán')) {
      return {
        reply: 'Đơn từ 5.000.000đ miễn phí vận chuyển (dưới 5tr phí 30.000đ). Hỗ trợ quét mã QR VNPay, MoMo và thanh toán COD.',
        nextAgent: false
      };
    }
    return {
      reply: 'SmartShop đã nhận câu hỏi của bạn. Bạn có thể bấm nút "Gặp chuyên viên" ở góc trên khung chat để được hỗ trợ sâu hơn.',
      nextAgent: false
    };
  };

  const sendMessageContent = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: trimmed, time: getNowTime() }]);
    setChatInput('');

    setTimeout(() => {
      const { reply, nextAgent } = generateSmartReply(trimmed, isAgentMode);
      if (nextAgent && !isAgentMode) {
        setIsAgentMode(true);
      }
      setChatMessages(prev => [
        ...prev,
        { sender: nextAgent ? 'agent' : isAgentMode ? 'agent' : 'bot', text: reply, time: getNowTime() }
      ]);
    }, 600);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageContent(chatInput);
  };

  const detailUnitPrice = selectedProduct
    ? Number(selectedProduct.base_price) + Number(selectedVariant?.price_diff || 0)
    : 0;

  // Thống kê doanh thu & đơn hàng cho Admin
  const validOrders = adminOrders.filter(o => o.status !== 'cancelled');
  const deliveredOrders = adminOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
  const shippingOrders = adminOrders.filter(o => o.status === 'shipping');
  const pendingOrders = adminOrders.filter(
    o => !o.status || (o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'shipping')
  );
  const cancelledOrders = adminOrders.filter(o => o.status === 'cancelled');

  const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const shippingRevenue = shippingOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const maxRevenueBar = Math.max(deliveredRevenue, shippingRevenue, pendingRevenue, 1);

  const currentSlideProduct = featuredSlides[slideIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative">
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-900 text-xs py-1.5 px-4 text-center text-slate-200 font-medium">
        ⚡ Flash Sale Giảm 15% | Miễn phí vận chuyển cho đơn từ 5.000.000đ | Hỗ trợ VNPay / MoMo / COD
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery('');
            }}
          >
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl shadow-inner">
              <Package className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wide bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                SMARTSHOP
              </h1>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Hệ Thống E-Commerce</span>
            </div>
          </div>

          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Tìm kiếm máy tính, chuột, bàn phím..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchUserOrders}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-200 transition shadow"
            >
              <History className="w-4 h-4 text-indigo-400" /> Đơn Hàng Của Tôi
            </button>

            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">{user.full_name}</span>
                {user.role === 'admin' && (
                  <button
                    onClick={handleOpenAdmin}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-white transition text-[11px] font-bold"
                    title="Quản trị hệ thống"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Quản Trị
                  </button>
                )}
                <button onClick={() => setUser(null)} className="text-slate-400 hover:text-rose-400" title="Đăng xuất">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-200 transition shadow"
              >
                <User className="w-4 h-4 text-slate-400" /> Đăng Nhập / Đăng Ký
              </button>
            )}

            <div
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-2xl cursor-pointer transition shadow-md shadow-indigo-600/30"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white">{totalCartCount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Quảng Cáo Chạy Tự Động Qua Vài Sản Phẩm */}
      <section className="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/25 p-6 md:p-10 shadow-2xl">
          {currentSlideProduct ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4 text-left">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Sparkles className="w-3.5 h-3.5" /> Quảng Cáo Nổi Bật ({slideIndex + 1}/{featuredSlides.length})
                </span>
                <h2 className="text-2xl md:text-4xl font-black text-white leading-tight line-clamp-2">
                  {currentSlideProduct.name}
                </h2>
                <p className="text-slate-300 text-xs md:text-sm line-clamp-2 leading-relaxed">
                  {currentSlideProduct.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="text-2xl font-black text-cyan-400">
                    {Number(currentSlideProduct.base_price).toLocaleString('vi-VN')} đ
                  </div>
                  <button
                    onClick={e => openProductDetail(currentSlideProduct, e)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
                  >
                    Chi tiết & Biến thể
                  </button>
                  <button
                    onClick={e => addToCart(currentSlideProduct, e)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
                  >
                    + Thêm Giỏ Hàng
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="h-56 md:h-64 w-full max-w-sm bg-slate-950/70 rounded-2xl p-4 border border-slate-800 flex items-center justify-center">
                  <img
                    src={currentSlideProduct.image_url}
                    alt={currentSlideProduct.name}
                    onError={e => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                    className="max-h-full object-contain rounded-xl transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-3xl font-extrabold text-white mb-2">Hệ Thống Phân Phối Thiết Bị Chính Hãng</h2>
              <p className="text-slate-400 text-sm">Giải pháp công nghệ doanh nghiệp bảo hành 12 tháng</p>
            </div>
          )}

          {featuredSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setSlideIndex(prev => (prev - 1 + featuredSlides.length) % featuredSlides.length)
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-slate-700 transition"
                title="Slide trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIndex(prev => (prev + 1) % featuredSlides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-slate-700 transition"
                title="Slide tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="flex justify-center gap-2 mt-6">
                {featuredSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === slideIndex ? 'w-7 bg-indigo-400' : 'w-2 bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Khu Vực Flash Sale */}
      {saleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-6">
          <div className="rounded-3xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-amber-950/40 border border-rose-500/30 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">FLASH SALE GIẢM 15%</h3>
                  <p className="text-xs text-slate-400">Ưu đãi giới hạn cho các thiết bị công nghệ bán chạy</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Đang diễn ra
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {saleProducts.map(item => {
                const salePrice = Math.round(Number(item.base_price) * 0.85);
                return (
                  <div
                    key={`sale-${item.id}`}
                    onClick={e => openProductDetail(item, e)}
                    className="bg-slate-950/90 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="relative h-32 bg-slate-900 rounded-xl p-2 flex items-center justify-center mb-3">
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black">
                          -15%
                        </span>
                        <img
                          src={item.image_url}
                          alt={item.name}
                          onError={e => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                          className="max-h-full object-contain rounded-lg"
                        />
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{item.name}</h4>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-sm font-black text-rose-400">
                          {salePrice.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[11px] text-slate-500 line-through">
                          {Number(item.base_price).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <button
                        onClick={e => addToCart(item, e, null, salePrice)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition"
                      >
                        Mua Giá Sale
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-4 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Danh Sách Sản Phẩm Nổi Bật
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cập nhật trực tiếp từ kho dữ liệu doanh nghiệp</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                selectedCategory === null
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Tất cả ({products.length})
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-28">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm">Không tìm thấy sản phẩm!</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedProducts.map(product => (
                <div
                  key={product.id}
                  onClick={e => openProductDetail(product, e)}
                  className="group bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-slate-950 flex items-center justify-center p-3">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        onError={e => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-amber-500/10 border border-amber-500/35 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-400 flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-amber-400" /> {product.rating}
                      </div>
                      <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-slate-800/80 shadow">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" /> {product.view_count}
                      </div>
                    </div>

                    <div className="p-5">
                      <h4 className="font-bold text-base text-white line-clamp-1 mb-2 group-hover:text-indigo-400 transition">
                        {product.name}
                      </h4>
                      <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="flex items-baseline justify-between mb-4 pt-3 border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">Giá niêm yết:</span>
                      <span className="text-base font-black text-indigo-400">
                        {Number(product.base_price).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={e => openProductDetail(product, e)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700/60 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" /> Chi tiết
                      </button>
                      <button
                        onClick={e => addToCart(product, e)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 active:scale-95"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Thêm
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Upgraded Floating Chatbot Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3.5 rounded-full shadow-2xl transition transform hover:scale-105 font-bold text-xs"
          >
            <Bot className="w-5 h-5" /> Hỗ Trợ Trực Tuyến
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-800 w-80 sm:w-96 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[500px]">
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                {isAgentMode ? <Headphones className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                <div>
                  <h4 className="text-xs font-bold">
                    {isAgentMode ? 'Chuyên Viên Tư Vấn' : 'SmartShop AI Bot'}
                  </h4>
                  <span className="text-[10px] text-indigo-200">
                    {isAgentMode ? 'Đang kết nối chuyên viên' : 'Trợ lý ảo thông minh'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!isAgentMode && (
                  <button
                    type="button"
                    onClick={switchToAgent}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-[10px] font-bold transition"
                  >
                    Gặp chuyên viên
                  </button>
                )}
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 mb-1 px-1">
                    {msg.sender === 'user' ? 'Bạn' : msg.sender === 'agent' ? 'Chuyên viên' : 'AI Bot'}
                    {msg.time ? ` • ${msg.time}` : ''}
                  </span>
                  <div
                    className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : msg.sender === 'agent'
                        ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-bl-none'
                        : 'bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="px-3 pt-2 pb-1.5 bg-slate-900 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto">
              {[
                'Tư vấn biến thể',
                'Thông số kỹ thuật',
                'Phí ship & QR',
                'Gặp chuyên viên'
              ].map(quick => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => sendMessageContent(quick)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 text-[10px] font-semibold text-slate-300 hover:text-indigo-300 transition"
                >
                  {quick}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="p-3 bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập câu hỏi..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal Chi Tiết Sản Phẩm: Biến Thể + Cột Thông Số + Đánh Giá */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
              <div className="space-y-4">
                <div className="h-72 bg-slate-950 rounded-2xl flex items-center justify-center p-4 border border-slate-800">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    onError={e => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                    className="max-h-full object-contain rounded-xl"
                  />
                </div>

                {/* Cột Thông Số Kỹ Thuật */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 text-xs font-bold text-indigo-400">
                    <Cpu className="w-4 h-4" /> Thông Số Kỹ Thuật
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {parseSpecs(selectedProduct).map((spec, idx) => (
                        <tr key={idx} className="border-b border-slate-800/70 last:border-b-0">
                          <td className="py-2.5 px-4 text-slate-400 font-medium w-2/5 bg-slate-900/40">
                            {spec.label}
                          </td>
                          <td className="py-2.5 px-4 text-slate-200 font-semibold">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Mã SP: #{selectedProduct.id}
                </span>
                <h3 className="text-2xl font-bold text-white mt-3 mb-2">{selectedProduct.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(selectedProduct.rating) ? 'fill-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{selectedProduct.rating} / 5</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed mb-5">{selectedProduct.description}</p>

                {/* Chọn Biến Thể */}
                <div className="mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs font-bold text-slate-200 mb-2.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" /> Chọn biến thể sản phẩm:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map(v => {
                      const active = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>{v.variant_name}</div>
                          {v.price_diff > 0 && (
                            <div className="text-[10px] opacity-90">
                              +{Number(v.price_diff).toLocaleString('vi-VN')} đ
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-2xl font-black text-indigo-400 mb-6">
                  {detailUnitPrice.toLocaleString('vi-VN')} đ
                </div>
                <button
                  onClick={() => {
                    addToCart(selectedProduct, undefined, selectedVariant);
                    setSelectedProduct(null);
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" /> Thêm Vào Giỏ Hàng
                </button>
              </div>
            </div>

            {/* Đánh giá */}
            <div className="pt-6 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" /> Đánh Giá Từ Khách Hàng (
                {productReviews.length})
              </h4>
              <form
                onSubmit={handleAddReview}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 space-y-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">Chọn số sao:</span>
                  <select
                    value={newComment.rating}
                    onChange={e => setNewComment({ ...newComment, rating: Number(e.target.value) })}
                    className="bg-slate-900 border border-slate-800 text-xs text-white p-1.5 rounded-lg"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                    <option value={3}>⭐⭐⭐ (3/5)</option>
                  </select>
                </div>
                <textarea
                  placeholder="Nhập cảm nhận của bạn..."
                  value={newComment.comment}
                  onChange={e => setNewComment({ ...newComment, comment: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white h-16 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Gửi Đánh Giá
                </button>
              </form>

              <div className="space-y-3">
                {productReviews.map(rev => (
                  <div key={rev.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-400">{rev.user_name}</span>
                      <div className="flex text-amber-400 text-xs">{'★'.repeat(rev.rating)}</div>
                    </div>
                    <p className="text-slate-300 text-xs">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-all">
          <div className="w-full max-w-md bg-slate-900 h-full border-l border-slate-800 flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" /> Giỏ Hàng ({totalCartCount})
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm">Giỏ hàng đang trống!</div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.cartKey}
                    className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      onError={e => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                      className="w-16 h-16 object-contain bg-slate-900 rounded-xl p-1"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.name}</h4>
                      {item.variantName && (
                        <span className="text-[11px] text-cyan-400 block">Biến thể: {item.variantName}</span>
                      )}
                      <p className="text-xs text-indigo-400 font-bold mt-1">
                        {Number(item.unitPrice).toLocaleString('vi-VN')} đ
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
                          <button
                            onClick={() => updateQuantity(item.cartKey, -1)}
                            className="p-1 text-slate-300"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartKey, 1)}
                            className="p-1 text-slate-300"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => setCart(cart.filter(c => c.cartKey !== item.cartKey))}
                          className="text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Tiền hàng:</span>
                  <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Phí vận chuyển:</span>
                  <span>{shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}</span>
                </div>
                <div className="flex justify-between text-base font-black text-indigo-400 pt-2 border-t border-slate-800">
                  <span>Tổng tiền:</span>
                  <span>{grandTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <button
                  onClick={handleProceedCheckout}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition shadow-lg mt-3"
                >
                  Tiến Hành Đặt Hàng & Thanh Toán
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Thanh Toán */}
      {isCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCheckoutModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-indigo-400" /> Thông Tin Giao Hàng & Thanh Toán
            </h3>

            {checkoutSuccess ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-white">Đặt Hàng Thành Công!</h4>
                <p className="text-xs text-slate-400">Đơn hàng của bạn đã được ghi nhận vào hệ thống.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmOrder} className="space-y-4">
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Địa Chỉ Nhận Hàng
                  </h4>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Họ và tên người nhận:</label>
                    <input
                      type="text"
                      value={shippingInfo.full_name}
                      onChange={e => setShippingInfo({ ...shippingInfo, full_name: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Số điện thoại liên hệ:</label>
                    <input
                      type="text"
                      value={shippingInfo.phone}
                      onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                      placeholder="0912345678"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Địa chỉ chi tiết:</label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={e => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                      placeholder="123 Đường Công Nghệ, TP.HCM"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">Tổng thanh toán:</span>
                    <span className="text-xl font-black text-indigo-400">
                      {grandTotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-300 block mb-2">Phương thức thanh toán:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vnpay')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === 'vnpay'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      VNPay QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('momo')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === 'momo'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Ví MoMo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === 'cod'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Tiền mặt (COD)
                    </button>
                  </div>

                  {paymentMethod !== 'cod' && (
                    <div className="mt-4 text-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <div className="bg-white p-3 inline-block rounded-xl mb-2 shadow">
                        <QrCode className="w-28 h-28 text-slate-950 mx-auto" />
                      </div>
                      <p className="text-xs font-bold text-indigo-300">
                        Quét mã QR bằng ứng dụng {paymentMethod.toUpperCase()}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Số tiền: {grandTotal.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition shadow-lg"
                >
                  Xác Nhận Đặt Hàng Ngay
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Lịch Sử Đơn Hàng */}
      {isOrdersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOrdersModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-400" /> Lịch Sử Đơn Hàng Của Bạn ({userOrders.length})
            </h3>

            {userOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">Bạn chưa có đơn hàng nào!</div>
            ) : (
              <div className="space-y-4">
                {userOrders.map(ord => {
                  const badge = getOrderStatusBadge(ord.status);
                  return (
                    <div
                      key={ord.id}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400">Đơn hàng #{ord.id}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(ord.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                        <div>
                          <strong>Người nhận:</strong> {ord.full_name}
                        </div>
                        <div>
                          <strong>Số điện thoại:</strong> {ord.phone}
                        </div>
                        <div className="md:col-span-2">
                          <strong>Địa chỉ:</strong> {ord.address}
                        </div>
                        <div>
                          <strong>Phương thức:</strong> {ord.payment_method.toUpperCase()}
                        </div>
                        <div>
                          <strong>Tổng tiền:</strong>{' '}
                          <span className="text-indigo-400 font-bold">
                            {Number(ord.total_amount).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {(ord.status === 'pending' || !ord.status) && (
                        <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-semibold transition border border-rose-500/30"
                          >
                            <Ban className="w-3.5 h-3.5" /> Hủy Đơn Hàng Này
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Auth */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex border-b border-slate-800 mb-5">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 pb-3 text-xs font-bold transition border-b-2 ${
                  authMode === 'login'
                    ? 'text-indigo-400 border-indigo-500'
                    : 'text-slate-400 border-transparent'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 pb-3 text-xs font-bold transition border-b-2 ${
                  authMode === 'register'
                    ? 'text-indigo-400 border-indigo-500'
                    : 'text-slate-400 border-transparent'
                }`}
              >
                Đăng Ký
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tài khoản:</label>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                    placeholder="admin hoặc user"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Mật khẩu:</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                    placeholder="Mật khẩu"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl">
                  Đăng Nhập
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Họ và tên:</label>
                  <input
                    type="text"
                    value={registerForm.full_name}
                    onChange={e => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                    placeholder="Nguyễn Văn B"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tên tài khoản:</label>
                  <input
                    type="text"
                    value={registerForm.username}
                    onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                    placeholder="nguyenvanb"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Mật khẩu:</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                    placeholder="Mật khẩu"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">
                  Tạo Tài Khoản
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Bảng Quản Trị Toàn Diện (Thống kê doanh thu + Đơn hàng + Sản phẩm) */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 relative shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsAdminOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6 pr-10">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-amber-400" /> Bảng Quản Trị Hệ Thống SMARTSHOP
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quản trị viên: <strong className="text-amber-400">{user?.full_name}</strong> | Thống kê doanh thu, vận đơn & sản phẩm
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAdminTab('stats');
                    loadAdminOrders();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    adminTab === 'stats'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" /> Doanh Thu & Thống Kê
                </button>
                <button
                  onClick={() => {
                    setAdminTab('orders');
                    loadAdminOrders();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    adminTab === 'orders'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Truck className="w-4 h-4" /> Đơn Hàng ({adminOrders.length})
                </button>
                <button
                  onClick={() => {
                    setAdminTab('products');
                    loadData();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    adminTab === 'products'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Package className="w-4 h-4" /> Sản Phẩm ({products.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Thống kê doanh thu & cột doanh thu */}
            {adminTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Tổng Doanh Thu (Hợp lệ)</div>
                    <div className="text-xl font-black text-indigo-400">
                      {totalRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{validOrders.length} đơn không hủy</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Doanh Thu Giao Thành Công</div>
                    <div className="text-xl font-black text-emerald-400">
                      {deliveredRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{deliveredOrders.length} đơn hoàn tất</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Đang Giao / Chờ Xử Lý</div>
                    <div className="text-xl font-black text-amber-400">
                      {(shippingRevenue + pendingRevenue).toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {pendingOrders.length} chờ • {shippingOrders.length} đang giao
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Đơn Đã Hủy</div>
                    <div className="text-xl font-black text-rose-400">{cancelledOrders.length} đơn</div>
                    <div className="text-[11px] text-slate-500 mt-1">Tổng {products.length} sản phẩm trong kho</div>
                  </div>
                </div>

                {/* Biểu đồ cột doanh thu theo trạng thái */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" /> Biểu Đồ Cột Doanh Thu Theo Trạng Thái Đơn
                  </h4>
                  <div className="grid grid-cols-3 gap-6 items-end h-52 pt-6 px-4 border-b border-slate-800">
                    {[
                      {
                        label: 'Chờ xử lý',
                        amount: pendingRevenue,
                        barClass: 'bg-amber-500'
                      },
                      {
                        label: 'Đang giao hàng',
                        amount: shippingRevenue,
                        barClass: 'bg-sky-500'
                      },
                      {
                        label: 'Giao thành công',
                        amount: deliveredRevenue,
                        barClass: 'bg-emerald-500'
                      }
                    ].map(col => {
                      const heightPct = col.amount > 0 ? Math.max(12, Math.round((col.amount / maxRevenueBar) * 100)) : 4;
                      return (
                        <div key={col.label} className="flex flex-col items-center h-full justify-end gap-2">
                          <span className="text-[11px] font-bold text-slate-200 text-center">
                            {col.amount.toLocaleString('vi-VN')} đ
                          </span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-16 sm:w-24 rounded-t-xl ${col.barClass} transition-all duration-500 shadow-lg`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center pt-3 text-xs font-semibold text-slate-400">
                    <div>Chờ xử lý ({pendingOrders.length})</div>
                    <div>Đang giao hàng ({shippingOrders.length})</div>
                    <div>Giao thành công ({deliveredOrders.length})</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Xem, xử lý, giao hàng, giao thành công đơn hàng */}
            {adminTab === 'orders' && (
              <div className="space-y-4">
                {adminOrders.length === 0 ? (
                  <div className="text-center py-14 text-slate-500 text-sm">
                    Chưa có đơn hàng nào trong hệ thống.
                  </div>
                ) : (
                  adminOrders.map(ord => {
                    const badge = getOrderStatusBadge(ord.status);
                    return (
                      <div
                        key={ord.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-400">Đơn #{ord.id}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                          <span className="text-xs font-black text-cyan-400">
                            {Number(ord.total_amount).toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-300">
                          <div>
                            <strong>Khách:</strong> {ord.full_name} ({ord.phone})
                          </div>
                          <div className="md:col-span-2">
                            <strong>Địa chỉ:</strong> {ord.address}
                          </div>
                          <div>
                            <strong>Thanh toán:</strong> {String(ord.payment_method || '').toUpperCase()}
                          </div>
                          <div className="md:col-span-2 text-[11px] text-slate-400">
                            <strong>Ngày đặt:</strong> {new Date(ord.created_at).toLocaleString('vi-VN')}
                          </div>
                        </div>

                        {/* Các nút thao tác quy trình đơn hàng */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/70">
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord.id, 'pending')}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/30 transition flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" /> Xử lý đơn
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord.id, 'shipping')}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-sky-500/15 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 transition flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" /> Giao đơn hàng
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/30 transition flex items-center gap-1"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Giao thành công
                          </button>
                          {ord.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled')}
                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" /> Hủy đơn
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 3: Thêm & Xóa sản phẩm */}
            {adminTab === 'products' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form
                  onSubmit={handleCreateProduct}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 h-fit"
                >
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-400" /> Thêm Sản Phẩm Mới
                  </h4>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tên sản phẩm:</label>
                    <input
                      type="text"
                      required
                      value={newProductForm.name}
                      onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })}
                      placeholder="VD: Bàn phím cơ Akko 5075B"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Giá gốc (VNĐ):</label>
                    <input
                      type="number"
                      required
                      value={newProductForm.base_price}
                      onChange={e => setNewProductForm({ ...newProductForm, base_price: e.target.value })}
                      placeholder="1500000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Danh mục:</label>
                    <select
                      value={newProductForm.category_id}
                      onChange={e => setNewProductForm({ ...newProductForm, category_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Link ảnh sản phẩm:</label>
                    <input
                      type="text"
                      value={newProductForm.image_url}
                      onChange={e => setNewProductForm({ ...newProductForm, image_url: e.target.value })}
                      placeholder="https://... (để trống dùng ảnh mặc định)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Thông số kỹ thuật:</label>
                    <input
                      type="text"
                      value={newProductForm.specs}
                      onChange={e => setNewProductForm({ ...newProductForm, specs: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Mô tả:</label>
                    <textarea
                      value={newProductForm.description}
                      onChange={e => setNewProductForm({ ...newProductForm, description: e.target.value })}
                      placeholder="Mô tả chi tiết sản phẩm..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white h-16"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    + Lưu Sản Phẩm
                  </button>
                </form>

                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 max-h-[460px] overflow-y-auto">
                  <h4 className="text-sm font-bold text-white mb-2">Danh Sách Sản Phẩm ({products.length})</h4>
                  {products.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          onError={e => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                          className="w-11 h-11 object-contain bg-slate-950 rounded-lg p-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{p.name}</div>
                          <div className="text-[11px] text-indigo-400 font-semibold">
                            {Number(p.base_price).toLocaleString('vi-VN')} đ • #{p.id}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold border border-rose-500/30 transition shrink-0 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}