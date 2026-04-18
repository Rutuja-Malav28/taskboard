public class Comment
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public required string Author { get; set; }
    public required string Body { get; set; }
    public DateTime CreatedAt { get; set; }

    public TaskItem? Task { get; set; }
}