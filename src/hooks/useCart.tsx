import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storedCard = localStorage.getItem('@RocketShoes:cart');

    if (storedCard) {
      return JSON.parse(storedCard);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);

      const { amount: minimumProductStock } = stockResponse.data;
      
      if (minimumProductStock === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        throw Error();
      }

      const productAlreadyInCart = cart.find(product => productId === product.id);

      if (productAlreadyInCart) {
        const updatedCart = cart.map(product => {
          if (product.id === productId) {
            const updatedAmount = product.amount + 1;

            if (updatedAmount > minimumProductStock) {
              toast.error('Quantidade solicitada fora de estoque');
              throw Error();
            }
            
            product.amount += 1;
          }
    
          return product;
        });
  
        setCart(updatedCart);
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        const response = await api.get<Product>(`/products/${productId}`);

        const { id, title, price, image } = response.data;

        if (response.status !== 200) {
          throw Error();
        }
  
        const updatedCart = [...cart, { id, title, price, image, amount: 1}];
  
        setCart(updatedCart);
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        throw Error();
      }

      const updatedCart = cart.filter(product => product.id !== productId);
    
      setCart(updatedCart);
    
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }

    try {
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
  
      const { amount: minimumProductStock } = stockResponse.data;
  
      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          if (amount > minimumProductStock) {
            toast.error('Quantidade solicitada fora de estoque');
            throw Error();
          }
          
          product.amount = amount;
        }
  
        return product;
      });
      
      setCart(updatedCart);
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
