import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Product {
  kode: string;
  nama: string;
  principle: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
}

export default function GenerateScreen() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]); // Menyimpan kode+principle
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const storedProducts = await AsyncStorage.getItem("barangMasuk");
      if (storedProducts) {
        const products: Product[] = JSON.parse(storedProducts);
        setAllProducts(products);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading products:", error);
      Alert.alert("Error", "Gagal memuat data produk");
      setIsLoading(false);
    }
  };

  const generateRandomProduct = () => {
    // Filter produk yang belum pernah di-generate (kode+principle unik)
    const availableProducts = allProducts.filter(
      (product) =>
        !generatedItems.includes(`${product.kode}|${product.principle}`)
    );

    if (availableProducts.length === 0) {
      Alert.alert("Info", "Semua produk sudah di-generate");
      return;
    }

    // Ambil random index dari produk yang tersedia
    const randomIndex = Math.floor(Math.random() * availableProducts.length);
    const selectedProduct = availableProducts[randomIndex];

    // Cari semua produk dengan kode DAN principle yang sama
    const sameProducts = allProducts.filter(
      (product) =>
        product.kode === selectedProduct.kode &&
        product.principle === selectedProduct.principle
    );

    // Update state
    setGeneratedProducts(sameProducts);
    setGeneratedItems([
      ...generatedItems,
      `${selectedProduct.kode}|${selectedProduct.principle}`,
    ]);
  };

  const resetGeneration = () => {
    setGeneratedProducts([]);
    setGeneratedItems([]);
    Alert.alert("Reset", "Daftar generate telah direset");
  };

  const getUniqueProductsCount = () => {
    const uniqueKeys = new Set(
      allProducts.map((p) => `${p.kode}|${p.principle}`)
    );
    return uniqueKeys.size - generatedItems.length;
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <Text style={styles.productName}>
        {item.nama} ({item.kode})
      </Text>
      <Text style={styles.principleText}>Principle: {item.principle}</Text>
      <View style={styles.stockRow}>
        <Text style={styles.stockText}>L: {item.stokLarge}</Text>
        <Text style={styles.stockText}>M: {item.stokMedium}</Text>
        <Text style={styles.stockText}>S: {item.stokSmall}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Product</Text>

      {isLoading ? (
        <Text>Memuat data...</Text>
      ) : (
        <>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.generateButton]}
              onPress={generateRandomProduct}
            >
              <Text style={styles.buttonText}>GENERATE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resetButton]}
              onPress={resetGeneration}
            >
              <Text style={styles.buttonText}>RESET</Text>
            </TouchableOpacity>
          </View>

          {generatedProducts.length > 0 && (
            <View style={styles.resultContainer}>
              <Text style={styles.principleName}>
                {generatedProducts[0].nama} ({generatedProducts[0].kode})
              </Text>
              <Text style={styles.principleText}>
                Principle: {generatedProducts[0].principle}
              </Text>
              <FlatList
                data={generatedProducts}
                renderItem={renderProductItem}
                keyExtractor={(item, index) => `${item.kode}-${index}`}
                contentContainerStyle={styles.productList}
              />
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Produk unik tersisa: {getUniqueProductsCount()}
            </Text>
            <Text style={styles.infoText}>
              Total di-generate: {generatedItems.length}
            </Text>
          </View>

          {getUniqueProductsCount() === 0 && allProducts.length > 0 && (
            <Text style={styles.emptyText}>Semua produk sudah di-generate</Text>
          )}
        </>
      )}
    </View>
  );
}

// Styles tetap sama seperti sebelumnya

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  generateButton: {
    backgroundColor: "#4CAF50",
  },
  resetButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  principleName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  productList: {
    paddingBottom: 10,
  },
  productItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  principleText: {
    fontSize: 14,
    color: "#555",
    marginVertical: 5,
  },
  stockRow: {
    flexDirection: "row",
    marginTop: 5,
  },
  stockText: {
    fontSize: 14,
    color: "#666",
    marginRight: 15,
  },
  remainingText: {
    marginTop: 10,
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
});
