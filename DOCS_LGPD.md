
# Documentação de Conformidade LGPD - Amplifica CRM

## 1. Mapeamento de Dados e Retenção

| Categoria | Dados Processados | Finalidade | Prazo de Retenção |
|-----------|-------------------|------------|-------------------|
| Usuário (Owner) | Nome, E-mail, Senha, IP | Execução de Contrato | Enquanto a conta estiver ativa |
| Leads | Nome, E-mail, Telefone, Consentimento | Gestão Comercial | 2 anos após inatividade (status 'lost') |
| Clientes | Dados de contato e branding | Gestão de Projetos | Até exclusão da conta pelo Owner |
| WhatsApp | Histórico de mensagens, Números | Suporte e Automação | Enquanto a sessão estiver ativa |
| Financeiro | Dados de recebíveis | Controle de Caixa | 5 anos (obrigatoriedade fiscal) |

## 2. Direitos do Titular

- **Portabilidade:** Implementado via endpoint `GET /api/auth/my-data`.
- **Exclusão:** O usuário pode deletar sua conta em Configurações > Segurança.
- **Transparência:** Política de privacidade expandida no rodapé da Landing Page.

## 3. Integridade e Segurança (Cascade Delete)

O sistema utiliza `ON DELETE CASCADE` em todas as tabelas vinculadas ao `owner_id` (Usuário Principal). Ao deletar um Owner:
- Parceiros, Clientes, Leads, Tarefas, Ordens de Serviço, Financeiro e Logs de Atividade são eliminados permanentemente do banco de dados.
- Sessões de WhatsApp e arquivos de cache locais são removidos via script de logout.

## 4. Plano de Resposta a Incidentes (IRP)

Em caso de suspeita de vazamento de dados ou acesso não autorizado:

1. **Detecção:** Monitoramento de logs de auditoria (`activity_logs` e `privacy_audit_logs`).
2. **Contenção:** Bloqueio imediato da conta afetada e revogação de tokens JWT/OAuth.
3. **Investigação:** Análise do `privacy_audit_logs` para identificar extensão do impacto.
4. **Notificação (Art. 48 LGPD):**
   - Notificar a ANPD em até 2 dias úteis.
   - Notificar os titulares afetados via e-mail cadastrado, detalhando:
     - Natureza dos dados afetados.
     - Medidas de segurança adotadas.
     - Riscos envolvidos e recomendações.

## 5. Encarregado de Dados (DPO)

- **Contato:** privacidade@amplifamarketing.com.br
- **Responsável:** Equipe de Compliance Amplifica.
