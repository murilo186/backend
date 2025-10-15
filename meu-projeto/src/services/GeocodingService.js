const axios = require('axios');
const Logger = require("../utils/logger");

class GeocodingService {
  static async getCoordinates(endereco) {
    try {
      // Construir endereço completo para geocoding
      const enderecoCompleto = `${endereco.rua || ''} ${endereco.numero || ''}, ${endereco.bairro || ''}, ${endereco.cidade || ''}, ${endereco.estado || ''}, Brasil`.trim();

      Logger.info("Buscando coordenadas para endereço (Google Geocoding)", { endereco: enderecoCompleto });

      // Usar Google Geocoding API
      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

      if (!GOOGLE_MAPS_API_KEY) {
        Logger.error("GOOGLE_MAPS_API_KEY não configurada");
        return null;
      }

      const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
          address: enderecoCompleto,
          key: GOOGLE_MAPS_API_KEY,
          region: 'br', // Restringir ao Brasil
          language: 'pt-BR'
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const coordinates = {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        };

        Logger.info("Coordenadas encontradas (Google Geocoding)", {
          ...coordinates,
          endereco_formatado: result.formatted_address,
          precisao: result.geometry.location_type
        });
        return coordinates;
      } else {
        Logger.warning("Nenhuma coordenada encontrada para o endereço", {
          endereco: enderecoCompleto,
          status: response.data.status,
          error_message: response.data.error_message
        });
        return null;
      }
    } catch (error) {
      Logger.error("Erro ao buscar coordenadas", {
        error: error.message,
        endereco
      });
      return null;
    }
  }

  static async calcularDistancia(origem, destino) {
    try {
      Logger.info("Calculando distância entre cidades", { origem, destino });

      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

      if (!GOOGLE_MAPS_API_KEY) {
        Logger.error("GOOGLE_MAPS_API_KEY não configurada");
        return null;
      }

      // Usar Distance Matrix API do Google Maps
      const response = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json`, {
        params: {
          origins: `${origem}, Brasil`,
          destinations: `${destino}, Brasil`,
          units: 'metric',
          mode: 'driving',
          key: GOOGLE_MAPS_API_KEY,
          language: 'pt-BR'
        }
      });

      if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
        const element = response.data.rows[0].elements[0];
        const resultado = {
          distancia: element.distance.text, // "85.2 km"
          distanciaKm: Math.round(element.distance.value / 1000), // 85
          tempo: element.duration.text, // "1 hora 15 min"
          tempoMinutos: Math.round(element.duration.value / 60) // 75
        };

        Logger.info("Distância calculada com sucesso", {
          origem,
          destino,
          ...resultado
        });

        return resultado;
      } else {
        Logger.warning("Não foi possível calcular distância", {
          origem,
          destino,
          status: response.data.status,
          element_status: response.data.rows[0].elements[0].status
        });
        return null;
      }
    } catch (error) {
      Logger.error("Erro ao calcular distância", {
        error: error.message,
        origem,
        destino
      });
      return null;
    }
  }
}

module.exports = GeocodingService;