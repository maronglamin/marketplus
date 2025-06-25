import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductBasicInfo } from './ProductBasicInfo';
import { ProductImages } from './ProductImages';
import { ProductPricing } from './ProductPricing';
import { ProductCondition } from './ProductCondition';
import { ProductDescription } from './ProductDescription';
import { ProductConfirmation } from './ProductConfirmation';

const Stack = createNativeStackNavigator();

interface ProductData {
  title: string;
  category?: string;
  images: Array<{ uri: string; isPrimary: boolean }>;
  price: number;
  currency: string;
  quantity: number;
  condition: string;
  description?: string;
}

export function AddProduct() {
  const [productData, setProductData] = useState<ProductData>({
    title: '',
    category: '',
    images: [],
    price: 0,
    currency: '',
    quantity: 0,
    condition: '',
    description: '',
  });

  const handleSubmit = async (product: ProductData) => {
    try {
      // TODO: Implement product submission
      console.log('Submitting product:', product);
      return Promise.resolve();
    } catch (error) {
      console.error('Error submitting product:', error);
      return Promise.reject(error);
    }
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProductBasicInfo">
        {(props) => (
          <ProductBasicInfo
            {...props}
            onNext={(title: string, category: string) => {
              setProductData(prev => ({ ...prev, title, category }));
              props.navigation.navigate('ProductImages');
            }}
            initialTitle={productData.title}
            initialCategory={productData.category}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ProductImages">
        {(props) => (
          <ProductImages
            {...props}
            onNext={(images: Array<{ uri: string; isPrimary: boolean }>) => {
              setProductData(prev => ({ ...prev, images }));
              props.navigation.navigate('ProductPricing');
            }}
            initialImages={productData.images}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ProductPricing">
        {(props) => (
          <ProductPricing
            {...props}
            onNext={(price: number, currency: string, quantity: number) => {
              setProductData(prev => ({ ...prev, price, currency, quantity }));
              props.navigation.navigate('ProductCondition');
            }}
            initialPrice={productData.price}
            initialCurrency={productData.currency}
            initialQuantity={productData.quantity}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ProductCondition">
        {(props) => (
          <ProductCondition
            {...props}
            onNext={(condition: string) => {
              setProductData(prev => ({ ...prev, condition }));
              props.navigation.navigate('ProductDescription');
            }}
            initialCondition={productData.condition}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ProductDescription">
        {(props) => (
          <ProductDescription
            {...props}
            onNext={(description: string) => {
              setProductData(prev => ({ ...prev, description }));
              props.navigation.navigate('ProductConfirmation');
            }}
            initialDescription={productData.description}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ProductConfirmation">
        {(props) => (
          <ProductConfirmation
            {...props}
            product={productData}
            onSubmit={handleSubmit}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
} 