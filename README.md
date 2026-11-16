# 🚗 Smart Parking — Sistema de Gestão Urbana Inteligente

> Sistema em tempo real de monitoramento e gestão de vagas de estacionamento, desenvolvido como parte da atividade acadêmica (**UPX IV** - Análise e Desenvolvimento de Sistemas na UniFacens).

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído com uma stack moderna e de alta performance:

* **Frontend:** [Angular](https://angular.dev/) (Standalone Components, Signals)
* **Estilização:** CSS Moderno (Layout responsivo em tema escuro)
* **Mapas & Geolocalização:** [Leaflet](https://leafletjs.com/) (OpenStreetMap)
* **Backend & Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL + Realtime WebSockets)

---

## 👥 Perfis de Acesso (Multi-tenant)
O sistema possui arquitetura multi-tenant, isolando dados e funcionalidades baseados no perfil do usuário:
- **Administrador (Gestor):** Acesso ao painel de BI, criação de vagas geolocalizadas, gerenciamento do próprio inventário de vagas e simulação de sensores.
- **Motorista:** Visualização de vagas disponíveis na cidade, fluxo de reserva, cálculo automático de tarifas e validação de check-in/checkout.##

---

## 🚀 Funcionalidades

- **Mapa Interativo Restrito:** Visualização geolocalizada centrada em Sorocaba com restrição de limites territoriais (Bounding Box).
- **Monitoramento em Tempo Real:** Atualização instantânea via Supabase Realtime para mudança de status das vagas.
- **Dashboard de Business Intelligence (BI):** Painel exclusivo para gestores com cálculo de faturamento atual, potencial máximo de receita e KPIs de fluxo.
- **Fluxo de Reserva Inteligente:** Motoristas podem reservar vagas por tempo determinado, com regras automatizadas de check-in (30 minutos de limite) e checkout (10 minutos de tolerância antes da cobrança adicional).
- **Cadastro de Vagas por Geolocalização:** Formulário modular integrado ao clique no mapa para captação exata de Latitude e Longitude.
- **Simulador de Sensores IoT:** Painel administrativo para alternar o estado do sensor físico (LIVRE / OCUPADA / RESERVADA), refletindo imediatamente na interface dos motoristas.

---

## ⚙️ Como Executar o Projeto Localmente

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado na sua máquina.

### 2. Clonar o repositório
```bash
git clone [https://github.com/SEU-USUARIO/smart-parking.git](https://github.com/SEU-USUARIO/smart-parking.git)
cd smart-parking
