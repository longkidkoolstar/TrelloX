import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card as CardType, Label, LabelColor, Comment, Attachment, Checklist, CheckItem } from '../types';
import { getCurrentUser } from '../firebase/auth';
import './CardModal.css';

interface CardModalProps {
  card: CardType;
  listId: string;
  listTitle: string;
  onClose: () => void;
  onUpdateCard: (listId: string, cardId: string, updatedCard: Partial<CardType>) => void;
}

const LABEL_COLORS: { color: LabelColor; name: string }[] = [
  { color: 'green', name: 'Green' },
  { color: 'yellow', name: 'Yellow' },
  { color: 'orange', name: 'Orange' },
  { color: 'red', name: 'Red' },
  { color: 'purple', name: 'Purple' },
  { color: 'blue', name: 'Blue' },
];

const CardModal: React.FC<CardModalProps> = ({
  card,
  listId,
  listTitle,
  onClose,
  onUpdateCard,
}) => {
  const [title, setTitle] = useState(card.content);
  const [description, setDescription] = useState(card.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(!card.description);
  const [dueDate, setDueDate] = useState(card.dueDate || '');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [selectedLabelColor, setSelectedLabelColor] = useState<LabelColor>('green');
  const [newCommentText, setNewCommentText] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [newCheckItemText, setNewCheckItemText] = useState('');
  const [editingChecklistTitleId, setEditingChecklistTitleId] = useState<string | null>(null);
  const [editedChecklistTitle, setEditedChecklistTitle] = useState('');
  const [editingCheckItemId, setEditingCheckItemId] = useState<string | null>(null);
  const [editedCheckItemText, setEditedCheckItemText] = useState('');

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    onUpdateCard(listId, card.id, { content: e.target.value });
  };

  const handleDescriptionSave = () => {
    onUpdateCard(listId, card.id, { description });
    setIsEditingDescription(false);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDueDate(e.target.value);
    onUpdateCard(listId, card.id, { dueDate: e.target.value });
  };

  const handleAddLabel = () => {
    const newLabel: Label = {
      id: uuidv4(),
      text: newLabelText,
      color: selectedLabelColor,
    };

    const updatedLabels = [...card.labels, newLabel];
    onUpdateCard(listId, card.id, { labels: updatedLabels });

    setNewLabelText('');
    setShowLabelPicker(false);
  };

  const handleRemoveLabel = (labelId: string) => {
    const updatedLabels = card.labels.filter(label => label.id !== labelId);
    onUpdateCard(listId, card.id, { labels: updatedLabels });
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;

    const currentUser = getCurrentUser();
    const newComment: Comment = {
      id: uuidv4(),
      text: newCommentText,
      createdAt: new Date().toISOString(),
      author: currentUser?.displayName || 'Anonymous',
      authorId: currentUser?.uid || ''
    };

    const updatedComments = [...card.comments, newComment];
    onUpdateCard(listId, card.id, { comments: updatedComments });

    setNewCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = card.comments.filter(comment => comment.id !== commentId);
    onUpdateCard(listId, card.id, { comments: updatedComments });
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) return;

    const newAttachment: Attachment = {
      id: uuidv4(),
      name: newAttachmentName,
      url: newAttachmentUrl,
      createdAt: new Date().toISOString(),
      uploadedBy: ''
    };

    const updatedAttachments = [...card.attachments, newAttachment];
    onUpdateCard(listId, card.id, { attachments: updatedAttachments });

    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setShowAttachmentForm(false);
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    const updatedAttachments = card.attachments.filter(attachment => attachment.id !== attachmentId);
    onUpdateCard(listId, card.id, { attachments: updatedAttachments });
  };

  const handleAddChecklist = () => {
    if (!newChecklistTitle.trim()) return;

    const newChecklist: Checklist = {
      id: uuidv4(),
      title: newChecklistTitle,
      items: [],
      pos: (card.checklists?.length || 0) + 1
    };

    const updatedChecklists = [...(card.checklists || []), newChecklist];
    onUpdateCard(listId, card.id, { checklists: updatedChecklists });

    setNewChecklistTitle('');
    setShowChecklistForm(false);
    setEditingChecklistId(newChecklist.id);
  };

  const handleDeleteChecklist = (checklistId: string) => {
    const updatedChecklists = card.checklists?.filter(checklist => checklist.id !== checklistId) || [];
    onUpdateCard(listId, card.id, { checklists: updatedChecklists });
  };

  const handleAddCheckItem = (checklistId: string) => {
    if (!newCheckItemText.trim()) return;

    const newCheckItem: CheckItem = {
      id: uuidv4(),
      name: newCheckItemText,
      state: 'incomplete',
      pos: 0
    };

    const updatedChecklists = card.checklists?.map(checklist => {
      if (checklist.id === checklistId) {
        // Add the new item and sort by position
        const updatedItems = [...checklist.items, newCheckItem]
          .map((item, _index) => ({ ...item, pos: item.id === newCheckItem.id ? checklist.items.length : item.pos }))
          .sort((a, b) => a.pos - b.pos);

        return {
          ...checklist,
          items: updatedItems
        };
      }
      return checklist;
    }) || [];

    onUpdateCard(listId, card.id, { checklists: updatedChecklists });
    setNewCheckItemText('');
  };

  const handleToggleCheckItem = (checklistId: string, checkItemId: string) => {
    const updatedChecklists = card.checklists?.map(checklist => {
      if (checklist.id === checklistId) {
        const updatedItems = checklist.items.map(item => {
          if (item.id === checkItemId) {
            return {
              ...item,
              state: item.state === 'complete' ? 'incomplete' : 'complete'
            };
          }
          return item;
        });

        return {
          ...checklist,
          items: updatedItems
        };
      }
      return checklist;
    }) || [];

    onUpdateCard(listId, card.id, { checklists: updatedChecklists as Checklist[] });
  };

  const handleDeleteCheckItem = (checklistId: string, checkItemId: string) => {
    const updatedChecklists = card.checklists?.map(checklist => {
      if (checklist.id === checklistId) {
        return {
          ...checklist,
          items: checklist.items.filter(item => item.id !== checkItemId)
        };
      }
      return checklist;
    }) || [];

    onUpdateCard(listId, card.id, { checklists: updatedChecklists });
  };

  const handleEditChecklistTitle = (checklistId: string) => {
    const checklist = card.checklists?.find(cl => cl.id === checklistId);
    if (checklist) {
      setEditingChecklistTitleId(checklistId);
      setEditedChecklistTitle(checklist.title);
    }
  };

  const handleSaveChecklistTitle = (checklistId: string) => {
    if (!editedChecklistTitle.trim()) return;

    const updatedChecklists = card.checklists?.map(checklist => {
      if (checklist.id === checklistId) {
        return {
          ...checklist,
          title: editedChecklistTitle.trim()
        };
      }
      return checklist;
    }) || [];

    onUpdateCard(listId, card.id, { checklists: updatedChecklists });
    setEditingChecklistTitleId(null);
  };

  const handleEditCheckItem = (checklistId: string, checkItemId: string) => {
    const checklist = card.checklists?.find(cl => cl.id === checklistId);
    const checkItem = checklist?.items.find(item => item.id === checkItemId);
    
    if (checklist && checkItem) {
      setEditingCheckItemId(checkItemId);
      setEditedCheckItemText(checkItem.name);
    }
  };

  const handleSaveCheckItem = (checklistId: string, checkItemId: string) => {
    if (!editedCheckItemText.trim()) return;

    const updatedChecklists = card.checklists?.map(checklist => {
      if (checklist.id === checklistId) {
        const updatedItems = checklist.items.map(item => {
          if (item.id === checkItemId) {
            return {
              ...item,
              name: editedCheckItemText.trim()
            };
          }
          return item;
        });

        return {
          ...checklist,
          items: updatedItems
        };
      }
      return checklist;
    }) || [];

    onUpdateCard(listId, card.id, { checklists: updatedChecklists });
    setEditingCheckItemId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal-close" onClick={onClose}>&times;</button>

        <div className="card-modal-header">
          <textarea
            className="card-modal-title"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter card title..."
          />
          <div className="card-modal-list">in list <strong>{listTitle}</strong></div>
        </div>

        <div className="card-modal-content">
          <div className="card-modal-main">
            {card.labels.length > 0 && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Labels</h3>
                <div className="card-modal-labels">
                  {card.labels.map(label => (
                    <div
                      key={label.id}
                      className={`card-modal-label card-label-${label.color}`}
                    >
                      <span>{label.text}</span>
                      <button
                        className="card-modal-label-remove"
                        onClick={() => handleRemoveLabel(label.id)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dueDate && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Due Date</h3>
                <div className="card-modal-due-date">
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={handleDueDateChange}
                  />
                </div>
              </div>
            )}

            <div className="card-modal-section">
              <h3 className="card-modal-section-title">Description</h3>
              {isEditingDescription ? (
                <div className="card-modal-description-edit">
                  <textarea
                    className="card-modal-description-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a more detailed description..."
                  />
                  <div className="card-modal-description-actions">
                    <button
                      className="card-modal-save-button"
                      onClick={handleDescriptionSave}
                    >
                      Save
                    </button>
                    <button
                      className="card-modal-cancel-button"
                      onClick={() => {
                        setDescription(card.description || '');
                        setIsEditingDescription(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="card-modal-description-display"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {description ? (
                    <p>{description}</p>
                  ) : (
                    <p className="card-modal-description-placeholder">Add a more detailed description...</p>
                  )}
                </div>
              )}
            </div>

            {card.attachments.length > 0 && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Attachments</h3>
                <div className="card-modal-attachments">
                  {card.attachments.map(attachment => (
                    <div key={attachment.id} className="card-modal-attachment">
                      <div className="card-modal-attachment-icon">📎</div>
                      <div className="card-modal-attachment-details">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="card-modal-attachment-name"
                        >
                          {attachment.name}
                        </a>
                        <div className="card-modal-attachment-date">
                          Added {formatDate(attachment.createdAt)}
                        </div>
                      </div>
                      <button
                        className="card-modal-attachment-delete"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAttachmentForm && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Add Attachment</h3>
                <div className="card-modal-attachment-form">
                  <input
                    type="text"
                    placeholder="Attachment name"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    className="card-modal-attachment-input"
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    className="card-modal-attachment-input"
                  />
                  <div className="card-modal-attachment-actions">
                    <button
                      className="card-modal-save-button"
                      onClick={handleAddAttachment}
                      disabled={!newAttachmentName.trim() || !newAttachmentUrl.trim()}
                    >
                      Add
                    </button>
                    <button
                      className="card-modal-cancel-button"
                      onClick={() => {
                        setNewAttachmentName('');
                        setNewAttachmentUrl('');
                        setShowAttachmentForm(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {card.checklists && card.checklists.length > 0 && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Checklists</h3>
                <div className="card-modal-checklists">
                  {card.checklists.map(checklist => (
                    <div key={checklist.id} className="card-modal-checklist">
                      <div className="card-modal-checklist-header">
                        {editingChecklistTitleId === checklist.id ? (
                          <div className="card-modal-checklist-title-edit">
                            <input
                              type="text"
                              value={editedChecklistTitle}
                              onChange={(e) => setEditedChecklistTitle(e.target.value)}
                              className="card-modal-checklist-title-input"
                              autoFocus
                            />
                            <div className="card-modal-checklist-title-actions">
                              <button
                                className="card-modal-save-button"
                                onClick={() => handleSaveChecklistTitle(checklist.id)}
                              >
                                Save
                              </button>
                              <button
                                className="card-modal-cancel-button"
                                onClick={() => setEditingChecklistTitleId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <h4 
                            className="card-modal-checklist-title"
                            onClick={() => handleEditChecklistTitle(checklist.id)}
                          >
                            {checklist.title}
                          </h4>
                        )}
                        <button
                          className="card-modal-checklist-delete"
                          onClick={() => handleDeleteChecklist(checklist.id)}
                        >
                          Delete
                        </button>
                      </div>

                      <div className="card-modal-checklist-items">
                        {checklist.items.map(item => (
                          <div key={item.id} className="card-modal-checklist-item">
                            <input
                              type="checkbox"
                              checked={item.state === 'complete'}
                              onChange={() => handleToggleCheckItem(checklist.id, item.id)}
                              className="card-modal-checklist-item-checkbox"
                            />
                            {editingCheckItemId === item.id ? (
                              <div className="card-modal-checklist-item-edit">
                                <input
                                  type="text"
                                  value={editedCheckItemText}
                                  onChange={(e) => setEditedCheckItemText(e.target.value)}
                                  className="card-modal-checklist-item-input"
                                  autoFocus
                                />
                                <div className="card-modal-checklist-item-edit-actions">
                                  <button
                                    className="card-modal-save-button"
                                    onClick={() => handleSaveCheckItem(checklist.id, item.id)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="card-modal-cancel-button"
                                    onClick={() => setEditingCheckItemId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span 
                                className={`card-modal-checklist-item-text ${item.state === 'complete' ? 'completed' : ''}`}
                                onClick={() => handleEditCheckItem(checklist.id, item.id)}
                              >
                                {item.name}
                              </span>
                            )}
                            <button
                              className="card-modal-checklist-item-delete"
                              onClick={() => handleDeleteCheckItem(checklist.id, item.id)}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>

                      {editingChecklistId === checklist.id && (
                        <div className="card-modal-checklist-item-form">
                          <input
                            type="text"
                            placeholder="Add an item"
                            value={newCheckItemText}
                            onChange={(e) => setNewCheckItemText(e.target.value)}
                            className="card-modal-checklist-item-input"
                          />
                          <div className="card-modal-checklist-item-actions">
                            <button
                              className="card-modal-save-button"
                              onClick={() => handleAddCheckItem(checklist.id)}
                              disabled={!newCheckItemText.trim()}
                            >
                              Add
                            </button>
                            <button
                              className="card-modal-cancel-button"
                              onClick={() => {
                                setNewCheckItemText('');
                                setEditingChecklistId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {editingChecklistId !== checklist.id && (
                        <button
                          className="card-modal-checklist-add-item"
                          onClick={() => setEditingChecklistId(checklist.id)}
                        >
                          Add an item
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showChecklistForm && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Add Checklist</h3>
                <div className="card-modal-checklist-form">
                  <input
                    type="text"
                    placeholder="Checklist title"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="card-modal-checklist-input"
                  />
                  <div className="card-modal-checklist-actions">
                    <button
                      className="card-modal-save-button"
                      onClick={handleAddChecklist}
                      disabled={!newChecklistTitle.trim()}
                    >
                      Add
                    </button>
                    <button
                      className="card-modal-cancel-button"
                      onClick={() => {
                        setNewChecklistTitle('');
                        setShowChecklistForm(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {card.comments.length > 0 && (
              <div className="card-modal-section">
                <h3 className="card-modal-section-title">Comments</h3>
                <div className="card-modal-comments">
                  {card.comments.map(comment => (
                    <div key={comment.id} className="card-modal-comment">
                      <div className="card-modal-comment-header">
                        <div className="card-modal-comment-author">{comment.author}</div>
                        <div className="card-modal-comment-date">{formatDate(comment.createdAt)}</div>
                        <button
                          className="card-modal-comment-delete"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          &times;
                        </button>
                      </div>
                      <div className="card-modal-comment-text">{comment.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card-modal-section">
              <h3 className="card-modal-section-title">Add Comment</h3>
              <div className="card-modal-comment-form">
                <textarea
                  className="card-modal-comment-input"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button
                  className="card-modal-save-button"
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="card-modal-sidebar">
            <h3 className="card-modal-sidebar-title">Add to Card</h3>

            <div className="card-modal-sidebar-buttons">
              <button
                className="card-modal-sidebar-button"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                <span className="card-modal-sidebar-button-icon">🏷️</span>
                <span className="card-modal-sidebar-button-text">Labels</span>
              </button>

              {showLabelPicker && (
                <div className="card-modal-label-picker">
                  <div className="card-modal-label-picker-header">
                    <h4>Labels</h4>
                    <button
                      className="card-modal-label-picker-close"
                      onClick={() => setShowLabelPicker(false)}
                    >
                      &times;
                    </button>
                  </div>

                  <div className="card-modal-label-colors">
                    {LABEL_COLORS.map(({ color, name }) => (
                      <div
                        key={color}
                        className={`card-modal-label-color card-label-${color} ${selectedLabelColor === color ? 'selected' : ''}`}
                        onClick={() => setSelectedLabelColor(color)}
                      >
                        <span>{name}</span>
                        {selectedLabelColor === color && <span className="card-modal-label-color-check">✓</span>}
                      </div>
                    ))}
                  </div>

                  <div className="card-modal-label-form">
                    <input
                      type="text"
                      placeholder="Label text (optional)"
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      className="card-modal-label-input"
                    />
                    <button
                      className="card-modal-save-button"
                      onClick={handleAddLabel}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <button
                className="card-modal-sidebar-button"
                onClick={() => {
                  if (!dueDate) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(12, 0, 0, 0);
                    const formattedDate = tomorrow.toISOString().slice(0, 16);
                    setDueDate(formattedDate);
                    onUpdateCard(listId, card.id, { dueDate: formattedDate });
                  }
                }}
              >
                <span className="card-modal-sidebar-button-icon">🕒</span>
                <span className="card-modal-sidebar-button-text">Due Date</span>
              </button>

              <button
                className="card-modal-sidebar-button"
                onClick={() => setShowAttachmentForm(!showAttachmentForm)}
              >
                <span className="card-modal-sidebar-button-icon">📎</span>
                <span className="card-modal-sidebar-button-text">Attachment</span>
              </button>

              <button
                className="card-modal-sidebar-button"
                onClick={() => setShowChecklistForm(!showChecklistForm)}
              >
                <span className="card-modal-sidebar-button-icon">✓</span>
                <span className="card-modal-sidebar-button-text">Checklist</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardModal;

