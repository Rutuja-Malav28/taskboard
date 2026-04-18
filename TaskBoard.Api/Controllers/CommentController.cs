using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/comments")]
public class CommentController : ControllerBase
{
    private readonly AppDbContext _context;

    public CommentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("task/{taskId}")]
    public async Task<ActionResult<IEnumerable<Comment>>> GetByTask(int taskId)
    {
        var comments = await _context.Comments
            .Where(c => c.TaskId == taskId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost]
    public async Task<ActionResult<Comment>> Create(CreateCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest("Comment body is required");

        var comment = new Comment
        {
            TaskId = dto.TaskId,
            Author = dto.Author ?? "User",
            Body = dto.Body,
            CreatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        return Ok(comment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComment(int id, UpdateCommentDto dto)
    {
        var comment = await _context.Comments.FindAsync(id);

        if (comment == null)
            return NotFound("Comment not found");

        if (!string.IsNullOrWhiteSpace(dto.Body))
            comment.Body = dto.Body;

        if (!string.IsNullOrWhiteSpace(dto.Author))
            comment.Author = dto.Author;

        await _context.SaveChangesAsync();

        return Ok(comment);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var comment = await _context.Comments.FindAsync(id);

        if (comment == null)
            return NotFound("Comment not found");

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return Ok("Comment deleted");
    }
}