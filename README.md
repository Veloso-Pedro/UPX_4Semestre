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

## 🚀 Funcionalidades

* **Mapa Interativo Restrito:** Visualização geolocalizada de Sorocaba com restrição de limites (Bounding Box) e tiles em modo escuro.
* **Monitoramento em Tempo Real:** Atualização instantânea via Supabase Realtime (WebSockets) do status das vagas.
* **Simulador de Sensores IoT:** Botões interativos em cada card para alternar o estado do sensor (`LIVRE` / `OCUPADA` / `RESERVADA`) com reflexo imediato no mapa e nos KPIs.
* **Cadastro de Novas Vagas por Geolocalização:** Formulário modular (`VagaForm`) integrado ao clique no mapa para captação automática de Latitude e Longitude.
* **Painel de KPIs:** Indicadores dinâmicos de vagas livres, total de vagas e taxa de ocupação urbana em tempo real.

---

## ⚙️ Como Executar o Projeto Localmente

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado na sua máquina.

### 2. Clonar o repositório
```bash
git clone [https://github.com/SEU-USUARIO/smart-parking.git](https://github.com/SEU-USUARIO/smart-parking.git)
cd smart-parking
