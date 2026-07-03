--
-- PostgreSQL database dump
--

\restrict L9h2vUXFBE7Dbfplgu7YK891WpZwNjt88mPWAN7Ynfgti6zbtv91cMbIeGhE2b0

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: project_schema_rules; Type: TABLE DATA; Schema: public; Owner: projmgmt
--

INSERT INTO public.project_schema_rules (id, rule_name, rule_type, project_type, project_stage, module_codes, table_definitions, is_enabled, sort_order, description, created_at, updated_at, project_status) VALUES ('a247c677-c1c9-4a8a-b97b-0edda27ce7b7', '项目有班牌', 'module', NULL, 'Impl', '["PM_1782397238715_um3es6kzp"]', '["yszx", "sslxyxmcbpg", "shfwyxmsw", "xxtbytdzj", "yhpxysyx", "swqr", "zdssjh", "nbgqxth", "xtbsycsh", "qqgdyxxsj", "yszb", "xckcyhjqr", "wlyymjxcxzb", "dyzlyyszb", "ssqdhyxqqr", "pxzb"]', true, 1, '', '2026-06-26 06:50:51.632+00', NULL, 'in_progress');
INSERT INTO public.project_schema_rules (id, rule_name, rule_type, project_type, project_stage, module_codes, table_definitions, is_enabled, sort_order, description, created_at, updated_at, project_status) VALUES ('24f417b3-7e02-40c1-b7d2-842b892018ff', '自研项目-实施阶段-进行中', 'type_stage', 'self_dev_software', 'qidong', '[]', '["yszx", "sslxyxmcbpg", "shfwyxmsw", "xxtbytdzj", "yhpxysyx", "swqr", "zdssjh", "nbgqxth", "xtbsycsh", "qqgdyxxsj", "yszb", "xckcyhjqr", "wlyymjxcxzb", "dyzlyyszb", "ssqdhyxqqr", "pxzb", "xqbjqrs", "qxdjb", "bgsqyyxpgb", "fwqrs", "wbs", "xmsszjh", "lcb", "zbhz", "rbhz", "csjh", "hetongfukuanjiedian", "gongshitongjibiao", "caigouqingdan", "feiyongbaoxiaojilu", "ganxirentongxunlu", "goutongjilu", "fengxiangdengjice", "wentigenzongbiao"]', true, 0, '', '2026-06-26 06:50:15.658+00', NULL, 'in_progress');


--
-- PostgreSQL database dump complete
--

\unrestrict L9h2vUXFBE7Dbfplgu7YK891WpZwNjt88mPWAN7Ynfgti6zbtv91cMbIeGhE2b0

