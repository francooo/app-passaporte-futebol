# Fontes e observações de dados — v05

Consulta feita em 26 de outubro de 2026. Os dados de capacidade são referências para um mockup, não uma base de produção.

## Geometria do mapa

- [Natural Earth — Admin 0 Countries, escala 1:110m](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/): conjunto de contornos nacionais; a página informa que o dataset é public domain.
- [Repositório GeoJSON Natural Earth](https://github.com/martynafford/natural-earth-geojson): conversão GeoJSON com licença CC0-1.0; o mapa do kit usa o arquivo `ne_110m_admin_0_countries.json`.

## Estádios e capacidades de referência

1. [Mâs Monumental — StadiumDB](https://stadiumdb.com/stadiums/arg/el_monumental): Buenos Aires; capacidade publicada de **85.018**.
2. [La Bombonera — notícia StadiumDB sobre a ampliação](https://stadiumdb.com/news/2024/10/argentina_renovations_on_la_bombonera_to_begin_as_early_as_2025): Buenos Aires; informa **57.200** após a inclusão de 3.000 assentos em 2023. Esse é o valor usado na prévia do mockup.
3. [Mario Alberto Kempes — StadiumDB](https://stadiumdb.com/stadiums/arg/estadio_mario_alberto_kempes): Córdoba; capacidade publicada de **57.000**.

### Divergência a resolver antes de produção

A [página de perfil da La Bombonera no StadiumDB](https://stadiumdb.com/stadiums/arg/la_bombonera) exibe **54.000** de capacidade e observa que, por segurança, somente **49.000** assentos são usados. Como essa página diverge da notícia de 2024, o ranking visual usa 57.200 apenas como exemplo de capacidade publicada, mas a capacidade operacional deve ser confirmada com o clube/administrador do estádio ou uma fonte oficial atualizada antes da integração real.

## Uso no protótipo

O mapa mostra apenas a Argentina como país selecionado. O ranking exibido é uma amostra visual; **Ver todos os estádios** representa a entrada para a lista completa, que não está conectada a uma API nesta versão. A indicação “IA” é parte do conceito de interface, não uma afirmação de que houve consulta a IA durante a execução do mockup.
