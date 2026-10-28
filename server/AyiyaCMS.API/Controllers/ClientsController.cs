// AyiyaCMS.API/Controllers/ClientsController.cs
using AyiyaCMS.Application.Features.Clients.DTOs;
using AyiyaCMS.Infrastructure.Features.Clients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/clients")]
[Authorize(Policy = "StaffOnly")]
public class ClientsController : ControllerBase
{
    private readonly ClientCommand _clients;

    public ClientsController(ClientCommand clients)
    {
        _clients = clients;
    }

    // ── GET /api/clients ──────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetClients([FromQuery] string? search = null)
    {
        var clients = await _clients.GetAllAsync(search);
        return Ok(clients);
    }

    // ── GET /api/clients/{id} ─────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetClient(Guid id)
    {
        var (client, matters) = await _clients.GetByIdAsync(id);
        if (client == null)
            return NotFound(new { message = "Client not found." });

        return Ok(new { client, matters });
    }

    // ── GET /api/clients/lawyers ──────────────────────
    // Used to populate the assigned lawyer dropdown in matter forms
    [HttpGet("lawyers")]
    public async Task<IActionResult> GetLawyers()
    {
        var lawyers = await _clients.GetLawyersAsync();
        return Ok(lawyers.Select(l => new { id = l.Item1, name = l.Item2 }));
    }

    // ── POST /api/clients ─────────────────────────────
    [HttpPost]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> CreateClient([FromBody] CreateClientRequest request)
    {
        var (success, message, client) = await _clients.CreateAsync(request);
        if (!success) return Conflict(new { message });
        return CreatedAtAction(nameof(GetClient), new { id = client!.Id }, client);
    }

    // ── PUT /api/clients/{id} ─────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "PartnerOrAdmin")]
    public async Task<IActionResult> UpdateClient(Guid id, [FromBody] UpdateClientRequest request)
    {
        var (success, message, client) = await _clients.UpdateAsync(id, request);
        if (!success) return BadRequest(new { message });
        return Ok(client);
    }

    // ── DELETE /api/clients/{id} ──────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteClient(Guid id)
    {
        var (success, message) = await _clients.DeleteAsync(id);
        if (!success) return BadRequest(new { message });
        return Ok(new { message });
    }
}