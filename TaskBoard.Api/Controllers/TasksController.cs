using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _context;

    public TasksController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetByProject(int projectId)
    {
        var tasks = await _context.Tasks
            .Where(t => t.ProjectId == projectId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("Title is required");

        var task = new TaskItem
        {
            Title = dto.Title,
            Description = dto.Description,
            Priority = (Priority)dto.Priority,
            Status = (Status)dto.Status,
            ProjectId = dto.ProjectId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return Ok(task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateTaskDto dto)
    {
        var task = await _context.Tasks.FindAsync(id);

        if (task == null)
            return NotFound("Task not found");

        task.Title = dto.Title ?? task.Title;
        task.Description = dto.Description ?? task.Description;
        task.Status = (Status)dto.Status;
        task.Priority = (Priority)dto.Priority;
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _context.Tasks.FindAsync(id);

        if (task == null)
            return NotFound("Task not found");

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        return Ok("Task deleted");
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok("Tasks working");
    }
}