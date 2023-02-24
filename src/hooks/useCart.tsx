import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get<Stock>(`/stock/${productId}`);

      const { amount } = response.data;

      if (amount < 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productAlreadyAdded = cart.find(
        (product) => product.id === productId,
      );

      if (productAlreadyAdded) {
        const cartUpdated = cart.map((product) => {
          if (product.id === productId) {
            return { ...product, amount: product.amount + 1 };
          }

          return product;
        });

        setCart(cartUpdated);
      } else {
        const responseProduct = await api.get<Product>(
          `/products/${productId}`,
        );

        setCart((oldState) => [
          ...oldState,
          {
            ...responseProduct.data,
            amount: 1,
          },
        ]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    const productExists = cart.find((product) => product.id === productId);

    if (!productExists) {
      toast.error("Erro na remoção do produto");
      return;
    }

    setCart((oldState) =>
      oldState.filter((product) => product.id !== productId),
    );
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    console.log({ amount });

    if (amount < 1) return;

    console.log({ amount }, "Continuou");

    try {
      const response = await api.get<Stock>(`/stock/${productId}`);

      const { amount: amountInStock } = response.data;

      if (amount > amountInStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productExists = cart.find((product) => product.id === productId);

      if (!productExists) {
        throw new Error();
      }

      const cartUpdated = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount };
        }

        return product;
      });

      setCart(cartUpdated);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
