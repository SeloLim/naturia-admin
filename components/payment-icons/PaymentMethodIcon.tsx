// app/components/payment-icons/PaymentMethodIcon.tsx
import React from 'react';
import paymentIconMap from './paymentIconMap'; // Path relatif ke file mapping di folder yang sama

// Definisikan tipe props untuk komponen ini
interface PaymentMethodIconProps {
  methodCode: string;
  methodName?: string;
  size?: number;
  [key: string]: unknown; 
}

const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({
  methodCode,
  methodName,
  size = 30,
  ...props 
}) => {
  const IconComponent = paymentIconMap[methodCode];

  if (!IconComponent) {
    console.warn(`[PaymentMethodIcon] Icon or mapping not found for code: "${methodCode}". Fallback used.`);
  }

  const ComponentToRender = IconComponent || paymentIconMap['DEFAULT_FALLBACK'];

  if (!ComponentToRender) {
     return (
       <div style={{ width: size, height: size, border: '1px solid #ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: size * 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={methodName || methodCode}>
         {methodName ? methodName.substring(0, Math.min(2, methodName.length)).toUpperCase() : methodCode.substring(0, Math.min(2, methodCode.length)).toUpperCase()}
       </div>
     );
  }

  const iconStyle: React.CSSProperties = {
      width: size,
      height: 'auto',
      ...(props.style || {}), 
  };

  const { ...restProps } = props;


  return (
    <ComponentToRender
      style={iconStyle}
      {...restProps}
    />
  );
};

export default PaymentMethodIcon;