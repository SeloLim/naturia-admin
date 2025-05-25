// app/components/payment-icons/paymentIconMap.ts

import { CreditCard } from 'lucide-react';
import { BcaVaIcon, DanaIcon, GopayIcon, QrisIcon } from '../icons';

type PaymentIconMap = {
  [key: string]: React.ElementType; 
};

const paymentIconMap: PaymentIconMap = {
  'BCA': BcaVaIcon,
  'GOPAY': GopayIcon,
  'DANA': DanaIcon,
  'QRIS': QrisIcon,

  'DEFAULT_FALLBACK': CreditCard,
};

export default paymentIconMap;